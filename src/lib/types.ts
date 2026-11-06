export type CountryCode = "US" | "GB" | "CA" | "AU" | "IN" | "AE" | "DE" | "FR";
export type CurrencyCode = "USD" | "GBP" | "CAD" | "AUD" | "INR" | "AED" | "EUR";
export type CategoryId = "medical" | "education" | "rent" | "electricity" | "water" | "emergency" | "other";

export type RequestStatus = "pending_review" | "active" | "needs_info" | "completed" | "rejected" | "withdrawn";

/** Verification states. "demo_approved" is a prototype moderation state — never an independent verification. */
export type VerificationState = "unverified" | "pending" | "demo_approved" | "rejected";

export type Role = "requester" | "donor" | "admin";

export interface BillRequest {
  id: string;
  userId: string;
  name: string;
  country: CountryCode;
  city: string;
  currency: CurrencyCode;
  category: CategoryId;
  title: string;
  amount: number;
  amountRaised: number;
  summary: string;
  story: string;
  dueDate: string;
  status: RequestStatus;
  verification: VerificationState;
  /** Seed for the generated, fictional profile image. */
  image: string;
  createdAt: string;
  updatedAt: string;
  supporters: number;
  flagged: boolean;
  /** Bill document metadata only — documents themselves are never stored. */
  document?: { name: string; type: string; sizeKb: number };
  /** Optional itemised breakdown, in the request's currency. Should sum to `amount`. */
  breakdown?: BillLineItem[];
  adminNote?: string;
  isDemo: true;
}

export interface BillLineItem {
  label: string;
  amount: number;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  country: CountryCode;
  bio: string;
  memberSince: string;
  image: string;
  status: "active" | "suspended";
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
  country: CountryCode;
  bio: string;
  image: string;
  memberSince: string;
  onboarded: boolean;
}

export type SwipeDirection = "left" | "right";

export interface SwipeRecord {
  requestId: string;
  direction: SwipeDirection;
  at: string;
}

export type ContributionKind = "simulated" | "commitment";

export interface Contribution {
  id: string;
  requestId: string;
  userId: string;
  donorName: string;
  amount: number;
  currency: CurrencyCode;
  kind: ContributionKind;
  /** recorded = simulated contribution logged; open/fulfilled/cancelled = commitment lifecycle */
  status: "recorded" | "open" | "fulfilled" | "cancelled";
  message?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  tone?: "default" | "success" | "warning";
}

export type ReportReason = "suspicious" | "duplicate" | "inappropriate" | "misleading" | "other";

export interface RequestReport {
  id: string;
  requestId: string;
  reporterId: string;
  reason: ReportReason;
  details: string;
  createdAt: string;
  status: "open" | "resolved" | "dismissed";
}

export interface ActivityItem {
  id: string;
  requestId?: string;
  userId: string;
  text: string;
  createdAt: string;
  kind: "created" | "updated" | "withdrawn" | "contribution" | "status" | "report";
}

/* ---------------- Admin review (prototype only) ---------------- */

/** The three simulated review checks a moderator records per request. Prototype states — never real verification. */
export type VerificationCheckId = "identity" | "document" | "recipient";
export type VerificationCheckStatus = "pending" | "passed" | "failed";

export interface VerificationCheck {
  status: VerificationCheckStatus;
  /** Display name of the demo moderator who last changed the check. */
  by?: string;
  /** ISO timestamp of the last change. */
  at?: string;
}

/** Missing checks default to "pending". */
export type VerificationChecklist = Partial<Record<VerificationCheckId, VerificationCheck>>;

/** Internal moderator note. Never shown to donors or requesters. */
export interface ModeratorNote {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}
