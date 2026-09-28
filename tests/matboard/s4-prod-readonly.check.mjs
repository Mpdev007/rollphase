// Check 4, the real-gym part: read-only (signed out, publishable key), confirms Pure Brazilian's
// live data has the exact shape the app's rendering code needs. No writes — RP_TARGET is never
// honored here; this always reads prod directly, on purpose, and only ever SELECTs.
import { createClient } from "@supabase/supabase-js";

const db = createClient("https://nllqyfmuzyyrxpqjamgj.supabase.co", "sb_publishable_AguKOHEW9UCXhJAc2Q-MTw_ySOXFGi9", {
  auth: { persistSession: false, autoRefreshToken: false },
});
const GYM = "rp-pure-bjj-norwood-park";
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  | " + detail : ""}`);
};

const near = await db.rpc("gyms_near", { p_lat: 41.9908, p_lng: -87.7958, p_km: 5 });
const row = (near.data || []).find((g) => g.id === GYM);
check("gyms_near finds Pure Brazilian near its own coordinates", !!row, JSON.stringify(row));
check("gyms_near reports all 39 slots (13 adult + 21 kids + 5 teens)", row?.slot_count === 39, `slot_count=${row?.slot_count}`);

const gym = await db.from("gyms").select("address,phone,website,source").eq("id", GYM).single();
check(
  "gyms row has address, phone, website, source='gym-website'",
  !!gym.data?.address && !!gym.data?.phone && !!gym.data?.website && gym.data?.source === "gym-website",
  JSON.stringify(gym.data)
);

const slots = await db.from("board_slots").select("source,confirmed_by,audience").eq("gym_id", GYM);
const adultSlots = (slots.data || []).filter((s) => s.audience === "adult");
const unconfirmedGymWebsite = adultSlots.filter((s) => s.source === "gym-website" && !s.confirmed_by);
check(
  "adult slots are gym-website sourced and unconfirmed (renders 'from the gym's schedule')",
  adultSlots.length === 13 && unconfirmedGymWebsite.length === 13,
  `adult=${adultSlots.length} unconfirmed-gym-website=${unconfirmedGymWebsite.length}`
);

const pass = results.filter(Boolean).length;
console.log(`\n${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
