/* Deterministic generator for the 36 demo applications.
   Ported from the prototype's data.js. Used only by scripts/seed.mjs to
   populate PostgreSQL on first setup — not bundled into the client. */
import { refs, people, headOfIT } from "./schema.js";

export function buildSeedApps() {
  // ---- seeded PRNG (mulberry32) so the data is stable across runs ----
  let _s = 0x9e3779b9;
  function rnd() { _s |= 0; _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const pickW = (pairs) => {
    const tot = pairs.reduce((s, p) => s + p[1], 0); let r = rnd() * tot;
    for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; } return pairs[0][0];
  };
  const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

  // ---- curated app seeds (name, vendor stack, dept, classification, criticalityBias) ----
  const seeds = [
    ["SAP S/4HANA", "ABAP / HANA", "Finance", "Vendor", 1], ["Oracle EBS", "Oracle / Java", "Finance", "Vendor", 1],
    ["IBM Maximo", "Java / WebSphere", "Asset Management", "Vendor", 1], ["WellView", ".NET / SQL Server", "Drilling Operations", "Vendor", 1],
    ["OpenWells (EDM)", "Oracle / .NET", "Drilling Operations", "Vendor", 1], ["Salesforce CRM", "Apex / Lightning", "Commercial", "SaaS", 2],
    ["Workday HCM", "Cloud / Java", "Human Resources", "SaaS", 1], ["ServiceNow ITSM", "JS / Glide", "Information Technology", "SaaS", 2],
    ["Microsoft 365", "Cloud", "Information Technology", "SaaS", 1], ["Power BI Service", "Cloud / DAX", "Commercial", "SaaS", 2],
    ["SAP Ariba", "Cloud", "Supply Chain", "SaaS", 2], ["Coupa Procurement", "Cloud", "Supply Chain", "SaaS", 3],
    ["SAP Concur", "Cloud", "Finance", "SaaS", 3], ["HSE Incident Tracker", "React / Node.js", "HSE & Compliance", "In-House", 1],
    ["Drilling Ops Dashboard", "React / Python", "Drilling Operations", "In-House", 2], ["Field Ticketing System", "Angular / .NET", "Field Engineering", "In-House", 1],
    ["Frac Fleet Telemetry", "Kafka / Go", "Well Services", "In-House", 1], ["Production Allocation Engine", "Python / Spark", "Production Solutions", "In-House", 1],
    ["Equipment Maintenance Hub", "Vue / Java", "Asset Management", "In-House", 2], ["Rig Scheduling Planner", ".NET / SQL", "Drilling Operations", "In-House", 2],
    ["Tableau Analytics", "Cloud", "Production Solutions", "SaaS", 3], ["Atlassian Jira", "Java", "Information Technology", "SaaS", 3],
    ["Confluence Wiki", "Java", "Information Technology", "SaaS", 4], ["DocuSign eSignature", "Cloud", "Legal", "SaaS", 3],
    ["Contract Lifecycle Mgr", "C# / SQL", "Legal", "Vendor", 3], ["Treasury Mgmt System", "Java / Oracle", "Finance", "Vendor", 1],
    ["Payroll Gateway", "Java", "Human Resources", "Vendor", 1], ["Learning Management System", "PHP / MySQL", "Human Resources", "Open Source", 4],
    ["Geospatial Asset Map", "Python / PostGIS", "Field Engineering", "Open Source", 2], ["IoT Sensor Platform", "Rust / TimescaleDB", "Well Services", "In-House", 2],
    ["Carbon Reporting Suite", "React / Node.js", "HSE & Compliance", "In-House", 2], ["Vendor Onboarding Portal", "Next.js", "Supply Chain", "In-House", 3],
    ["Customer Billing Portal", "React / Java", "Commercial", "Hybrid", 1], ["Identity & Access Mgr", "Java", "Information Technology", "Vendor", 1],
    ["Backup & Recovery Console", "C++ / Linux", "Information Technology", "Vendor", 2], ["Legacy Inventory DB", "PowerBuilder", "Supply Chain", "In-House", 4],
    ["Mobile Field App", "React Native", "Field Engineering", "In-House", 2], ["Data Lake Platform", "Spark / Delta", "Production Solutions", "Hybrid", 2],
    ["VPN Access Gateway", "C / Linux", "Information Technology", "Vendor", 1], ["Email Security Gateway", "Cloud", "Information Technology", "SaaS", 1],
  ];

  function isoAdd(base, days) { const d = new Date(base); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
  const TODAY = new Date("2026-06-02");

  function buildApp(i, seed) {
    const [name, stack, dept, classification, critBias] = seed;
    const saas = classification === "SaaS";
    const onPrem = classification === "In-House" || classification === "Open Source";
    const hosting = saas ? "SaaS" : onPrem ? pickW([["On-Premises", 3], ["Cloud – Private", 2], ["Hybrid", 1]]) : pick(refs.hostingModel);
    const cloud = hosting === "On-Premises" ? "N/A" : hosting === "SaaS" ? pick(["AWS", "Azure", "GCP"]) : pickW([["Azure", 4], ["AWS", 3], ["GCP", 1], ["Oracle Cloud", 1]]);
    const arch = pickW([["Microservices", 3], ["Monolith", 3], ["SOA", 1], ["Serverless", 1], ["Event-Driven", 1]]);
    const crit = refs.businessCriticality[Math.min(3, critBias - 1 + (rnd() < 0.25 ? 1 : 0))];
    const critTier = crit.startsWith("Tier 1") ? 1 : crit.startsWith("Tier 2") ? 2 : crit.startsWith("Tier 3") ? 3 : 4;
    const dr = refs.drTier[critTier - 1];
    const seatCount = ri(1, 6) * 50 * (5 - critTier);
    const totalUsers = Math.max(20, seatCount + ri(-40, 120));
    const activeUsers = Math.max(5, Math.round(totalUsers * (0.4 + rnd() * 0.55)));
    const license = saas ? ri(40, 400) * 1000 : onPrem ? (classification === "Open Source" ? 0 : ri(20, 200) * 1000) : ri(60, 600) * 1000;
    const maint = Math.round(license * (0.12 + rnd() * 0.25)) + ri(5, 40) * 1000;
    const tco = license + maint + ri(10, 90) * 1000;
    const goLive = isoAdd(TODAY, -ri(200, 3200));
    const lastUpgrade = isoAdd(TODAY, -ri(20, 500));
    const status = critTier <= 2 ? pickW([["Active", 8], ["Under Review", 1]]) : pickW([["Active", 6], ["Under Review", 2], ["Sunset", 1], ["Under Development", 1]]);
    const pii = ["Human Resources", "Commercial", "Legal", "Finance"].includes(dept) ? pickW([["Yes", 3], ["Partial", 1]]) : pickW([["No", 3], ["Partial", 1], ["Yes", 1]]);
    const reg = pii === "Yes" ? pick(["GDPR", "SOX", "Multiple", "ISO 27001"]) : pickW([["None", 3], ["ISO 27001", 2], ["NIST", 1], ["SOX", 1]]);
    const vuln = pickW([["None", 4], ["Low", 4], ["Medium", 2], ["High", 1], ["Critical", critTier === 1 ? 0 : 1]]);
    const intCount = arch === "Microservices" ? ri(6, 24) : ri(0, 9);
    const intc = intCount <= 3 ? "Low (1–3)" : intCount <= 10 ? "Medium (4–10)" : "High (10+)";

    return {
      id: i + 1,
      appId: "NESR-APP-" + String(1000 + (i + 1) * 7).slice(0, 4),
      name,
      alias: name.split(/[\s(]/)[0].toUpperCase().slice(0, 6),
      businessOwner: pick(people), itOwner: pick(people), department: dept,
      costCentre: "CC-" + ri(2000, 8999), classification,
      techStack: stack, hostingModel: hosting, cloudProvider: cloud, architectureType: arch,
      primaryDatabase: pick(["Oracle 19c", "SQL Server 2022", "PostgreSQL 16", "HANA", "MongoDB", "MySQL 8", "Snowflake", "N/A"]),
      currentVersion: "v" + ri(1, 9) + "." + ri(0, 9) + "." + ri(0, 9), integrationCount: intCount,
      status, goLiveDate: goLive, lastUpgradeDate: lastUpgrade,
      plannedRetirement: status === "Sunset" ? isoAdd(TODAY, ri(60, 400)) : (rnd() < 0.25 ? isoAdd(TODAY, ri(400, 1800)) : ""),
      vendorEolDate: classification === "Vendor" || saas ? isoAdd(TODAY, ri(200, 1600)) : "",
      nextReviewDate: isoAdd(TODAY, ri(-40, 200)), reviewFrequency: pick(refs.reviewFrequency),
      dataClassification: pickW([["Internal", 4], ["Confidential", 3], ["Restricted", 2], ["Public", 1], ["Top Secret", critTier === 1 ? 1 : 0]]),
      containsPii: pii, regulatoryScope: reg, lastSecurityReview: isoAdd(TODAY, -ri(20, 360)),
      openVulnerabilities: vuln, drTier: dr, rto: [2, 4, 12, 48][critTier - 1], rpo: [1, 2, 8, 24][critTier - 1],
      annualLicenseCost: license, annualMaintCost: maint, tco,
      licenseModel: saas ? pick(["Subscription", "Per Seat", "Concurrent"]) : classification === "Open Source" ? "Open Source" : pick(["Perpetual", "Subscription", "Per CPU"]),
      seatCount, contractRenewalDate: isoAdd(TODAY, ri(-30, 500)), contractRef: "CTR-" + ri(10000, 99999),
      chargebackMethod: pick(refs.chargebackMethod),
      supportTier: refs.supportTier[Math.min(3, critTier - 1)], slaAvailability: refs.slaAvailability[Math.min(4, critTier - 1)],
      primarySupportContact: pick(people), escalationContact: pick(people),
      itsmQueue: dept.split(" ")[0].toUpperCase() + "-OPS", monitoringTool: onPrem ? pick(["Splunk", "Nagios", "Datadog"]) : pick(["Datadog", "Dynatrace", "Azure Monitor"]),
      maintenanceWindow: pick(["Sun 02:00–04:00", "Sat 22:00–02:00", "Fri 23:00–01:00", "Daily 03:00–03:30"]),
      businessCriticality: crit, customerFacing: pickW([["No", 4], ["Partially", 2], ["Yes", 1]]),
      activeUsers, totalUserBase: totalUsers,
      businessProcess: pick(["Drilling & Completion", "Well Intervention", "Procure-to-Pay", "Order-to-Cash", "Record-to-Report", "Hire-to-Retire", "Asset Lifecycle", "HSE Reporting", "Field Service Delivery"]),
      strategicAlignment: critTier === 1 ? pick(["Core – Competitive Differentiator", "Important – Operational"]) : pick(refs.strategicAlignment),
      businessValueNotes: "Supports " + dept + " operations; " + (critTier <= 2 ? "outage directly impacts field revenue." : "moderate operational impact if unavailable."),
      upstreamSystems: pick(["SAP S/4HANA", "Active Directory", "Data Lake Platform", "WellView", "—"]),
      downstreamSystems: pick(["Power BI Service", "Data Lake Platform", "Treasury Mgmt System", "—"]),
      apiMiddleware: pick(["MuleSoft", "Azure API Mgmt", "Kafka", "REST / direct", "—"]),
      ssoProvider: onPrem ? pick(["LDAP", "ADFS", "Azure AD"]) : pick(["Azure AD", "Okta"]),
      sharedInfra: pick(["Shared K8s cluster", "Dedicated VMs", "Vendor-managed", "Shared SQL estate"]),
      dataFlowDoc: rnd() < 0.6 ? "DFD-" + ri(100, 999) : "Not documented",
      integrationComplexity: intc,
      // ---- workflow metadata ----
      approvalStatus: "Approved", submittedBy: pick(people), submittedDate: isoAdd(goLive, -ri(20, 90)),
      approvedBy: headOfIT, decisionDate: isoAdd(goLive, -ri(1, 18)), decisionNote: "",
    };
  }

  const apps = seeds.slice(0, 36).map((s, i) => buildApp(i, s));

  // Make a handful Pending / Draft / Rejected for the approval workflow.
  function pendize(idx, st, note) {
    const a = apps[idx]; a.approvalStatus = st; a.submittedBy = pick(people);
    a.submittedDate = isoAdd(TODAY, -ri(1, 14));
    if (st === "Pending" || st === "Draft") { a.status = "Under Development"; a.approvedBy = ""; a.decisionDate = ""; a.decisionNote = ""; }
    if (st === "Rejected") { a.status = "Under Development"; a.approvedBy = headOfIT; a.decisionDate = isoAdd(TODAY, -ri(1, 6)); a.decisionNote = note; }
  }
  pendize(30, "Pending"); pendize(31, "Pending"); pendize(35, "Pending"); pendize(28, "Pending");
  pendize(26, "Draft"); pendize(22, "Draft");
  pendize(34, "Rejected", "Duplicate of existing VPN Access Gateway capability — consolidate rather than onboard a new tool.");

  return apps;
}
