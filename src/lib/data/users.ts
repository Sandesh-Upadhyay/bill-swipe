import type { Contribution, DemoUser, RequestReport, Session } from "@/lib/types";
import { buildSeedRequests } from "./requests";

/** FICTIONAL DEMO DATA — no real people. */
const DAY = 86_400_000;
const anchor = () => {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
const at = (offsetDays: number, hours = 0) => new Date(anchor() + offsetDays * DAY + hours * 3_600_000).toISOString();

export const DEMO_ACCOUNTS = {
  donor: {
    userId: "u_demo_donor",
    name: "Alex Morgan",
    email: "alex.donor@demo.billswipe",
    role: "donor",
    country: "US",
    bio: "Product designer in Austin. I like knowing exactly where my help goes.",
    image: "u_demo_donor",
    memberSince: at(-210),
    onboarded: true,
  },
  requester: {
    userId: "u_demo_requester",
    name: "Sam Okafor",
    email: "sam.requester@demo.billswipe",
    role: "requester",
    country: "GB",
    bio: "Youth worker and carer in Manchester. Grateful for every bit of kindness.",
    image: "u_demo_requester",
    memberSince: at(-120),
    onboarded: true,
  },
  admin: {
    userId: "u_demo_admin",
    name: "Jordan Lee",
    email: "jordan.admin@demo.billswipe",
    role: "admin",
    country: "AU",
    bio: "Trust & Safety moderator (demo account).",
    image: "u_demo_admin",
    memberSince: at(-400),
    onboarded: true,
  },
} satisfies Record<string, Session>;

const donorSeeds: Array<Pick<DemoUser, "id" | "name" | "country" | "bio"> & { since: number }> = [
  { id: "u_demo_donor", name: "Alex Morgan", country: "US", bio: DEMO_ACCOUNTS.donor.bio, since: -210 },
  { id: "u_d_hannah", name: "Hannah Becker", country: "DE", bio: "Nurse in Munich. Supporting education requests.", since: -330 },
  { id: "u_d_arjun", name: "Arjun Mehta", country: "IN", bio: "Software engineer, Bengaluru.", since: -280 },
  { id: "u_d_chloe", name: "Chloé Bernard", country: "FR", bio: "Architect in Paris.", since: -190 },
  { id: "u_d_ethan", name: "Ethan Walsh", country: "AU", bio: "Teacher in Melbourne.", since: -150 },
  { id: "u_d_nadia", name: "Nadia Rahman", country: "AE", bio: "Finance analyst in Abu Dhabi.", since: -260 },
  { id: "u_d_oliver", name: "Oliver Grant", country: "GB", bio: "Retired engineer in Edinburgh.", since: -365 },
  { id: "u_d_maya", name: "Maya Chen", country: "CA", bio: "Pharmacist in Calgary.", since: -90 },
  { id: "u_d_lucas", name: "Lucas Silva", country: "US", bio: "Chef in Chicago.", since: -60 },
];

export function buildSeedUsers(): DemoUser[] {
  const requests = buildSeedRequests();
  const requesters = new Map<string, DemoUser>();
  for (const r of requests) {
    if (requesters.has(r.userId)) continue;
    const isSam = r.userId === "u_demo_requester";
    requesters.set(r.userId, {
      id: r.userId,
      name: isSam ? DEMO_ACCOUNTS.requester.name : r.name,
      email: isSam ? DEMO_ACCOUNTS.requester.email : `${r.userId.replace("u_r_", "")}@demo.billswipe`,
      role: "requester",
      country: r.country,
      bio: isSam ? DEMO_ACCOUNTS.requester.bio : `Fictional requester based in ${r.city}.`,
      memberSince: isSam ? DEMO_ACCOUNTS.requester.memberSince : r.createdAt,
      image: r.userId,
      status: r.userId === "u_r_unknown" ? "suspended" : "active",
    });
  }
  const donors: DemoUser[] = donorSeeds.map((d) => ({
    id: d.id,
    name: d.name,
    email: d.id === "u_demo_donor" ? DEMO_ACCOUNTS.donor.email : `${d.id.replace("u_d_", "")}@demo.billswipe`,
    role: "donor",
    country: d.country,
    bio: d.bio,
    memberSince: at(d.since),
    image: d.id,
    status: "active",
  }));
  const admin: DemoUser = {
    id: DEMO_ACCOUNTS.admin.userId,
    name: DEMO_ACCOUNTS.admin.name,
    email: DEMO_ACCOUNTS.admin.email,
    role: "admin",
    country: "AU",
    bio: DEMO_ACCOUNTS.admin.bio,
    memberSince: DEMO_ACCOUNTS.admin.memberSince,
    image: DEMO_ACCOUNTS.admin.userId,
    status: "active",
  };
  return [admin, ...donors, ...requesters.values()];
}

/** Deterministic pseudo-random generator so seed data is stable across server/client. */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeedContributions(): Contribution[] {
  const requests = buildSeedRequests().filter((r) => r.status === "active" || r.status === "completed");
  const rand = mulberry32(42);
  const out: Contribution[] = [];
  const donors = donorSeeds.slice(1);
  for (let i = 0; i < 46; i++) {
    const r = requests[Math.floor(rand() * requests.length)];
    const d = donors[Math.floor(rand() * donors.length)];
    const base = r.currency === "INR" ? 800 : r.currency === "AED" ? 60 : 15;
    const amount = Math.round(base * (1 + Math.floor(rand() * 6)));
    out.push({
      id: `c_seed_${i}`,
      requestId: r.id,
      userId: d.id,
      donorName: d.name,
      amount,
      currency: r.currency,
      kind: "simulated",
      status: "recorded",
      createdAt: at(-Math.floor(rand() * 28) - 1, Math.floor(rand() * 20)),
    });
  }
  // Demo donor history (Alex Morgan)
  const alex: Array<[string, number, number, Contribution["kind"], Contribution["status"]]> = [
    ["req_marisol", 50, -16, "simulated", "recorded"],
    ["req_ananya", 2500, -14, "simulated", "recorded"],
    ["req_grace", 40, -11, "simulated", "recorded"],
    ["req_keisha", 25, -27, "simulated", "recorded"],
    ["req_kemal", 30, -6, "simulated", "recorded"],
    ["req_amelia", 20, -3, "simulated", "recorded"],
    ["req_darnell", 50, -1, "commitment", "open"],
  ];
  const reqMap = new Map(buildSeedRequests().map((r) => [r.id, r]));
  alex.forEach(([rid, amount, day, kind, status], i) => {
    const r = reqMap.get(rid)!;
    out.push({
      id: `c_alex_${i}`,
      requestId: rid,
      userId: "u_demo_donor",
      donorName: "Alex Morgan",
      amount,
      currency: r.currency,
      kind,
      status,
      message: i === 0 ? "Wishing you a smooth recovery!" : undefined,
      createdAt: at(day, 10),
    });
  });
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function buildSeedReports(): RequestReport[] {
  return [
    { id: "rep_1", requestId: "req_unknown", reporterId: "u_d_oliver", reason: "suspicious", details: "No details, very large amount, and the profile was created today.", createdAt: at(-5, 9), status: "resolved" },
    { id: "rep_2", requestId: "req_jarrah", reporterId: "u_d_nadia", reason: "misleading", details: "Wondering whether the flood date matches the story — could the requester add more detail?", createdAt: at(-1, 14), status: "open" },
    { id: "rep_3", requestId: "req_yusuf", reporterId: "u_d_lucas", reason: "duplicate", details: "I think I saw a similar request earlier this month.", createdAt: at(-2, 18), status: "open" },
    { id: "rep_4", requestId: "req_hugo", reporterId: "u_d_maya", reason: "other", details: "Just checking the amount includes both items.", createdAt: at(-1, 8), status: "dismissed" },
  ];
}
