// Live kill tests for the Mat Board schema (publishable keys only; both are public by design).
// Runs against rollphase-staging by default. RP_TARGET=prod runs it against the live project: only with the owner's go.
// Test data uses ids prefixed "qa-" at a neutral Austin point; it is removed afterwards from the SQL editor.
import { createClient } from "@supabase/supabase-js";

const TARGETS = {
  staging: ["https://ogvjfogfhodjwzjxsirt.supabase.co", "sb_publishable_U0LN_YBnTEyvsIclmC1_pQ_eGVs-JGK"],
  prod: ["https://nllqyfmuzyyrxpqjamgj.supabase.co", "sb_publishable_AguKOHEW9UCXhJAc2Q-MTw_ySOXFGi9"],
};
const TARGET = process.env.RP_TARGET || "staging";
if (!TARGETS[TARGET]) throw new Error(`RP_TARGET must be staging or prod, got ${TARGET}`);
const [URL, KEY] = TARGETS[TARGET];
console.log(`target: ${TARGET} (${URL})`);
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

// Realtime readiness: "SUBSCRIBED" means the socket joined the channel; the change feed is ready only when the
// server sends the system message {extension: "postgres_changes", status: "ok"} ("Subscribed to PostgreSQL").
// After an idle spell that message can come late, and a write made before it is not delivered live. So every
// live check writes only after that message, and the time to it is its own check (a cold start shows up there).
// The board client must do the same: treat the board as live only after this message, and reload once when it arrives.
const liveChannel = (client, name, spec, onEvent) => new Promise((resolve) => {
  const t = Date.now(); let ch; let done = false;
  const finish = (readyMs) => { if (!done) { done = true; resolve({ ch, readyMs }); } };
  ch = client.channel(name)
    .on("postgres_changes", spec, onEvent)
    .on("system", {}, (m) => { if (m?.extension === "postgres_changes" && m?.status === "ok") finish(Date.now() - t); })
    .subscribe();
  setTimeout(() => finish(-1), 20000);
});

// 10. realtime: B hears A's "I'm in" (the 2 s kill test for I1)
{ const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  let t0 = 0, hit;
  const heard = new Promise((r) => { hit = r; });
  const { ch, readyMs } = await liveChannel(B, "qa-intents-" + Date.now(),
    { event: "INSERT", schema: "public", table: "intents", filter: `slot_id=eq.${slotId}` }, () => hit(Date.now() - t0));
  check("change feed ready after subscribing (within 20 s)", readyMs >= 0, readyMs >= 0 ? `${readyMs} ms` : "no ready message in 20 s");
  t0 = Date.now();
  const ins = await A.from("intents").insert({ slot_id: slotId, user_id: idA, on_date: tomorrow });
  const ms = ins.error ? -2 : await Promise.race([heard, new Promise((r) => setTimeout(() => r(-1), 12000))]);
  await B.removeChannel(ch);
  check("realtime delivers A's I'm-in to B within 2 s", ms >= 0 && ms <= 2000, ms === -1 ? "no event in 12 s" : ms === -2 ? `insert failed: ${ins.error.message}` : `${ms} ms`); }

// 11. leaving: A un-taps "I'm in" and B hears it. intents is in the realtime publication, so a delete needs a
// primary key (the replica identity); this proves the surrogate-id key keeps deletes working. Postgres DELETE
// events can't be filtered, so B listens to the table and matches the deleted row's id.
{ const today = new Date().toISOString().slice(0, 10);
  const mine = await A.from("intents").select("id").eq("slot_id", slotId).eq("user_id", idA).eq("on_date", today).single();
  const rowId = mine.data?.id;
  check("A's intent has a row id (surrogate key)", Number.isInteger(rowId), mine.error?.message || `id=${rowId}`);
  let t0 = 0, hit;
  const heard = new Promise((r) => { hit = r; });
  const { ch, readyMs } = await liveChannel(B, "qa-leave-" + Date.now(),
    { event: "DELETE", schema: "public", table: "intents" }, (p) => { if (p.old?.id === rowId) hit(Date.now() - t0); });
  t0 = Date.now();
  const del = readyMs < 0 ? { error: { message: "change feed never ready" } } : await A.from("intents").delete().eq("id", rowId).select();
  const ms = del.error ? -2 : (del.data || []).length !== 1 ? -3 : await Promise.race([heard, new Promise((r) => setTimeout(() => r(-1), 12000))]);
  await B.removeChannel(ch);
  check("A leaves (delete) and B hears it within 2 s", ms >= 0 && ms <= 2000,
        ms === -1 ? "no event in 12 s" : ms === -2 ? `delete failed: ${del.error.message}` : ms === -3 ? "delete removed no row" : `${ms} ms`);
  const v = await anon.from("board_slots").select("in_count").eq("id", slotId).single();
  check("board count drops after leaving", v.data?.in_count === 1, v.error?.message || `in_count=${v.data?.in_count} (tomorrow's I'm-in remains)`); }

const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} passed`);
console.log(JSON.stringify({ idA, idB, slotId, checkA }));
process.exit(pass === results.length ? 0 : 1);
