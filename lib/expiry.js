// Shared expiry-flagging logic used by the dashboard box and the application detail banner.

// Date fields that represent an expiry / renewal / review deadline.
export const EXPIRY_SOURCES = [
  { key: "vendorEolDate", label: "Vendor end-of-life" },
  { key: "contractRenewalDate", label: "Contract renewal" },
  { key: "plannedRetirement", label: "Planned retirement" },
  { key: "nextReviewDate", label: "Next review" },
];

// Tiers ordered most-urgent first. days <= max wins; anything already expired lands in the maroon tier.
export const EXP_TIERS = [
  { max: 7, key: "critical", color: "#7B1E1E", soft: "#F3E1E1", name: "≤ 7 days" },   // maroon
  { max: 30, key: "urgent", color: "#C0392B", soft: "#FADFDA", name: "≤ 30 days" },   // red
  { max: 60, key: "soon", color: "#C8971C", soft: "#F7EED2", name: "≤ 60 days" },     // yellow
  { max: 90, key: "upcoming", color: "#2A7E4F", soft: "#E1F0E8", name: "≤ 90 days" }, // green
];

export const EXPIRY_WINDOW = 90;

export const expTierFor = (days) => EXP_TIERS.find((t) => days <= t.max) || EXP_TIERS[EXP_TIERS.length - 1];

// Days from *today* (real date, not the pinned demo date) to an ISO date; negative = already expired.
export function daysFromNow(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const t = new Date();
  return Math.round((d.setHours(0, 0, 0, 0) - t.setHours(0, 0, 0, 0)) / 86400000);
}

export function expiryLabel(days) {
  if (days < 0) return `Expired ${-days}d ago`;
  if (days === 0) return "Due today";
  return `${days}d left`;
}

// All upcoming expiries for a single app, within `window` days, most-urgent first.
export function appExpiries(app, window = EXPIRY_WINDOW) {
  const out = [];
  for (const s of EXPIRY_SOURCES) {
    const days = daysFromNow(app[s.key]);
    if (days != null && days <= window) out.push({ what: s.label, date: app[s.key], days });
  }
  const ce = app.certExpiry && typeof app.certExpiry === "object" ? app.certExpiry : {};
  for (const [cert, dt] of Object.entries(ce)) {
    const days = daysFromNow(dt);
    if (days != null && days <= window) out.push({ what: `Certification · ${cert}`, date: dt, days });
  }
  return out.sort((a, b) => a.days - b.days);
}
