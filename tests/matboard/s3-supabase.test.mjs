// Live kill tests for the Mat Board schema on rollphase-prod (publishable key only).
// Test data uses ids prefixed "qa-" at a neutral Austin point; it is removed afterwards from the SQL editor.
import { createClient } from "@supabase/supabase-js";

const URL = "https://nllqyfmuzyyrxpqjamgj.supabase.co";
const KEY = "sb_publishable_AguKOHEW9UCXhJAc2Q-MTw_ySOXFGi9";
const GYM = "qa-gym-austin-" + Date.now();
const LAT = 30.2672, LNG = -97.7431;               // the test gym
const FAR = { lat: 30.3120, lng: -97.7431 };       // ~5 km north
const NEAR = { lat: 30.2676, lng: -97.7431 };      // ~45 m north

const mem = () => { const s = new Map(); return { getItem: (k) => s.get(k) ?? null, setItem: (k, v) => s.set(k, v), removeItem: (k) => s.delete(k) }; };
const client = () => createClient(URL, KEY, { auth: { storage: mem(), persistSession: true, autoRefreshToken: false } });

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  | " + detail : ""}`); };

const anon = client();
const A = client(), B = client();

// 0. signed-out read
{ const { error } = await anon.from("gyms").select("id").limit(1); check("signed-out reader can read gyms", !error, error?.message); }

// 1. anonymous sign-in for two users
const ua = (await A.auth.signInAnonymously()); const ub = (await B.auth.signInAnonymously());
check("anonymous sign-in A", !!ua.data?.user && !ua.error, ua.error?.message);
check("anonymous sign-in B", !!ub.data?.user && !ub.error, ub.error?.message);
const idA = ua.data?.user?.id, idB = ub.data?.user?.id;
check("A and B are different users", idA && idB && idA !== idB);

// 2. signed-out cannot write
{ const { error } = await anon.from("gyms").insert({ id: "qa-should-fail", name: "x", loc: `SRID=4326;POINT(${LNG} ${LAT})` });
  check("signed-out insert into gyms is refused", !!error, error?.message); }

// 3. A seeds the gym (the I5 path: any venue someone opens becomes a row)
{ const { error } = await A.from("gyms").upsert({ id: GYM, name: "QA test gym", loc: `SRID=4326;POINT(${LNG} ${LAT})`, city: "Austin, TX", created_by: idA });
  check("A seeds a gym", !error, error?.message); }

// 4. profiles: own only
{ const e1 = (await A.from("profiles").upsert({ id: idA, display_name: "QA-A", sport: "bjj", belt: "blue" })).error;
  check("A writes own profile", !e1, e1?.message);
  const r = await B.from("profiles").update({ display_name: "hacked" }).eq("id", idA).select();
  check("B cannot change A's profile", !r.error ? (r.data || []).length === 0 : true, r.error?.message || `rows=${(r.data || []).length}`);
  const r2 = await A.from("profiles").select("display_name").eq("id", idA).single();
  check("A's name unchanged", r2.data?.display_name === "QA-A", r2.data?.display_name); }

// 5. shared timetable: A adds, B corrects
let slotId;
{ const r = await A.from("slots").insert({ gym_id: GYM, weekday: 2, start_min: 19 * 60, sport: "bjj", kind: "open-mat", gear: ["gi"], created_by: idA, confirmed_by: idA }).select().single();
  check("A adds a slot", !r.error && !!r.data?.id, r.error?.message); slotId = r.data?.id;
  const u = await B.from("slots").update({ note: "bring a gi", confirmed_by: idB, confirmed_at: new Date().toISOString() }).eq("id", slotId).select();
  check("B can correct/confirm the shared slot", !u.error && (u.data || []).length === 1, u.error?.message);
  const f = await B.from("slots").insert({ gym_id: GYM, weekday: 3, start_min: 600, sport: "bjj", created_by: idA });
  check("B cannot create a slot in A's name", !!f.error, f.error?.message); }

// 6. intents: own only
{ const today = new Date().toISOString().slice(0, 10);
  const a = await A.from("intents").insert({ slot_id: slotId, user_id: idA, on_date: today });
  check("A taps I'm in", !a.error, a.error?.message);
  const b = await B.from("intents").insert({ slot_id: slotId, user_id: idA, on_date: today });
  check("B cannot tap I'm in for A", !!b.error, b.error?.message);
  const v = await anon.from("board_slots").select("id, in_count").eq("id", slotId).single();
  check("board view shows the count to a signed-out reader", v.data?.in_count === 1, v.error?.message || `in_count=${v.data?.in_count}`); }

// 7. geofenced check-in
let checkA;
{ const far = await A.rpc("check_in", { p_gym_id: GYM, p_lat: FAR.lat, p_lng: FAR.lng, p_slot_id: slotId });
  check("check-in from ~5 km is refused", !!far.error && /150 m/.test(far.error.message), far.error?.message);
  const near = await A.rpc("check_in", { p_gym_id: GYM, p_lat: NEAR.lat, p_lng: NEAR.lng, p_slot_id: slotId });
  check("check-in from ~45 m is accepted", !near.error && !!near.data?.id, near.error?.message); checkA = near.data?.id;
  const again = await A.rpc("check_in", { p_gym_id: GYM, p_lat: NEAR.lat, p_lng: NEAR.lng, p_slot_id: slotId });
  check("a second check-in returns the same row", again.data?.id === checkA, `first=${checkA} second=${again.data?.id}`);
  const x = await anon.rpc("check_in", { p_gym_id: GYM, p_lat: NEAR.lat, p_lng: NEAR.lng });
  check("signed-out cannot call check_in", !!x.error, x.error?.message);
  const raw = await A.from("checkins").insert({ gym_id: GYM, user_id: idA });
  check("direct insert into checkins is refused (functions only)", !!raw.error, raw.error?.message); }

// 8. handshake without co-location is refused
{ const r = await A.rpc("attest_belt", { p_subject: idB, p_belt: "white" });
  check("attest without shared check-in is refused", !!r.error, r.error?.message);
  const s = await A.rpc("attest_belt", { p_subject: idA, p_belt: "black" });
  check("self-attestation is refused", !!s.error, s.error?.message); }

// 9. nearby search from the app's own cache
{ const r = await anon.rpc("gyms_near", { p_lat: NEAR.lat, p_lng: NEAR.lng, p_km: 25 });
  const row = (r.data || []).find((g) => g.id === GYM);
  check("gyms_near finds the gym (<1 km, 1 slot)", !!row && row.km < 1 && Number(row.slot_count) === 1, r.error?.message || JSON.stringify(row)); }

// 10. realtime: B hears A's "I'm in" (the 2 s kill test for I1)
{ const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  let t0 = 0, ch;
  const got = new Promise((resolve) => {
    ch = B.channel("qa-intents-" + Date.now())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "intents", filter: `slot_id=eq.${slotId}` }, () => resolve(Date.now() - t0))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await new Promise((r) => setTimeout(r, 1500));
          t0 = Date.now();
          const ins = await A.from("intents").insert({ slot_id: slotId, user_id: idA, on_date: tomorrow });
          if (ins.error) resolve(-2);
        }
      });
    setTimeout(() => resolve(-1), 12000);
  });
  const ms = await got; await B.removeChannel(ch);
  check("realtime delivers A's I'm-in to B within 2 s", ms >= 0 && ms <= 2000, ms === -1 ? "no event in 12 s" : ms === -2 ? "insert failed" : `${ms} ms`); }

const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} passed`);
console.log(JSON.stringify({ idA, idB, slotId, checkA }));
process.exit(pass === results.length ? 0 : 1);
