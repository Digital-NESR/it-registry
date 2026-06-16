/* Deterministic generator for the demo applications.
   Used only by scripts/seed.mjs to populate PostgreSQL — not bundled into the
   client. Produces the new (split / expanded) field set. */
import { refs, people, headOfIT, costCentres, ON_PREM_MODELS } from "./schema.js";

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
  const sample = (arr, n) => { const c = [...arr]; const out = []; while (out.length < n && c.length) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]); return out; };

  // name, vendor stack, dept, sourcing-seed, criticalityBias
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
  const allNames = seeds.map((s) => s[0]);

  function isoAdd(base, days) { const d = new Date(base); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
  const TODAY = new Date("2026-06-02");

  const VENDORS = { "SAP": "SAP SE", "Oracle": "Oracle Corp.", "Salesforce": "Salesforce Inc.", "Workday": "Workday Inc.",
    "ServiceNow": "ServiceNow Inc.", "Microsoft": "Microsoft Corp.", "Power": "Microsoft Corp.", "Coupa": "Coupa Software",
    "Tableau": "Salesforce Inc.", "Atlassian": "Atlassian", "Confluence": "Atlassian", "DocuSign": "DocuSign Inc.", "IBM": "IBM" };

  function buildApp(i, seed) {
    const [name, stack, dept, sclass, critBias] = seed;
    const saas = sclass === "SaaS";
    const onPrem = sclass === "In-House" || sclass === "Open Source";
    const sourcing = saas || sclass === "Hybrid" ? "Vendor" : sclass; // In-House / Vendor / Open Source
    const hosting = saas ? "SaaS" : onPrem ? pickW([["On-Premises", 3], ["Cloud – Private", 2], ["Hybrid", 1]]) : pick(refs.hostingModel);
    const isOnPrem = ON_PREM_MODELS.includes(hosting);
    const cloud = hosting === "On-Premises" ? "N/A" : hosting === "SaaS" ? pick(["AWS", "Azure", "GCP"]) : pickW([["Azure", 4], ["AWS", 3], ["GCP", 1], ["Oracle Cloud", 1]]);
    const arch = pickW([["Microservices", 3], ["Monolith", 3], ["SOA", 1], ["Serverless", 1], ["Event-Driven", 1]]);
    const crit = refs.businessCriticality[Math.min(3, critBias - 1 + (rnd() < 0.25 ? 1 : 0))];
    const critTier = crit.startsWith("Tier 1") ? 1 : crit.startsWith("Tier 2") ? 2 : crit.startsWith("Tier 3") ? 3 : 4;
    const seatCount = ri(1, 6) * 50 * (5 - critTier);
    const totalUsers = Math.max(20, seatCount + ri(-40, 120));
    const license = saas ? ri(40, 400) * 1000 : onPrem ? (sclass === "Open Source" ? 0 : ri(20, 200) * 1000) : ri(60, 600) * 1000;
    const maint = Math.round(license * (0.12 + rnd() * 0.25)) + ri(5, 40) * 1000;
    const tco = license + maint + ri(10, 90) * 1000;
    const goLive = isoAdd(TODAY, -ri(200, 3200));
    const status = critTier <= 2 ? pickW([["Active", 8], ["Under Review", 1]]) : pickW([["Active", 6], ["Under Review", 2], ["Sunset", 1], ["Under Development", 1]]);
    const pii = ["Human Resources", "Commercial", "Legal", "Finance"].includes(dept) ? pickW([["Yes", 3], ["Partial", 1]]) : pickW([["No", 3], ["Partial", 1], ["Yes", 1]]);
    const reg = pii === "Yes" ? pick(["GDPR", "SOX", "Multiple", "ISO 27001"]) : pickW([["None", 3], ["ISO 27001", 2], ["NIST", 1], ["SOX", 1]]);
    const vuln = pickW([["None", 4], ["Low", 4], ["Medium", 2], ["High", 1], ["Critical", critTier === 1 ? 0 : 1]]);
    const intCount = arch === "Microservices" ? ri(6, 24) : ri(0, 9);
    const intc = intCount <= 3 ? "Low (1–3)" : intCount <= 10 ? "Medium (4–10)" : "High (10+)";
    const alias = name.split(/[\s(]/)[0].toUpperCase().slice(0, 6);
    const hasDr = critTier <= 2 ? "Yes" : pickW([["Yes", 1], ["No", 2]]);
    const certs = (() => {
      const c = [];
      if (rnd() < 0.8) c.push("ISO 27001");
      if (saas || sclass === "Vendor") { if (rnd() < 0.6) c.push("SOC 2 (SOX 2)"); if (rnd() < 0.3) c.push("SOC 1 (SOX 1)"); }
      if (["Commercial", "Finance"].includes(dept) && rnd() < 0.4) c.push("PCI-DSS");
      return c.length ? c : ["None"];
    })();
    const vendorName = !onPrem ? (VENDORS[name.split(/[\s(]/)[0]] || (name.split(/[\s(]/)[0] + " Ltd.")) : "";

    return {
      id: i + 1,
      appId: "NESR-APP-" + String(1000 + (i + 1) * 7).slice(0, 4),
      name, alias,
      subDomain: alias.toLowerCase() + ".nesr.com",
      businessOwner: pick(people), itOwner: pick(people), department: dept,
      costCentre: pick(costCentres), sourcing,
      techStack: stack, hostingModel: hosting,
      hostingLocation: isOnPrem ? pick(["NESR DC — Dubai", "NESR DC — Abu Dhabi", "NESR DC — Dammam"]) : (cloud + " — " + pick(["UAE North", "West Europe", "US East", "Bahrain"])),
      hostingService: hosting === "SaaS" ? "Vendor SaaS" : isOnPrem ? pick(["VMware vSphere", "Hyper-V", "Bare metal"]) : pick(["Azure App Service", "Azure AKS", "AWS EC2", "AWS ECS", "GCP GKE"]),
      cloudProvider: cloud, architectureType: arch,
      primaryDatabase: pick(["Oracle 19c", "SQL Server 2022", "PostgreSQL 16", "HANA", "MongoDB", "MySQL 8", "Snowflake", "N/A"]),
      currentVersion: "v" + ri(1, 9) + "." + ri(0, 9) + "." + ri(0, 9), integrationCount: intCount,
      // on-prem details (only meaningful when on-prem/hybrid)
      publicIp: isOnPrem && rnd() < 0.5 ? "10." + ri(0, 254) + "." + ri(0, 254) + "." + ri(1, 254) : "",
      onPremLocation: isOnPrem ? pick(["Rack B12 — Dubai DC", "Rack A4 — Abu Dhabi DC", "Cage 3 — Dammam DC"]) : "",
      serverDetails: isOnPrem ? pick(["2× RHEL 9 VMs, 8 vCPU / 32 GB", "Windows Server 2022, 16 vCPU / 64 GB", "3-node Linux cluster"]) : "",
      dbDetails: isOnPrem ? pick(["SQL Server 2022, 1 TB", "Oracle 19c RAC, 2 TB", "PostgreSQL 16, 500 GB"]) : "",
      serverOwner: isOnPrem ? pick(people) : "",
      status, goLiveDate: goLive, lastUpgradeDate: isoAdd(TODAY, -ri(20, 500)),
      plannedRetirement: status === "Sunset" ? isoAdd(TODAY, ri(60, 400)) : (rnd() < 0.25 ? isoAdd(TODAY, ri(400, 1800)) : ""),
      vendorEolDate: sclass === "Vendor" || saas ? isoAdd(TODAY, ri(200, 1600)) : "",
      nextReviewDate: isoAdd(TODAY, ri(-40, 200)), reviewFrequency: pick(refs.reviewFrequency),
      dataClassification: pickW([["Internal", 4], ["Confidential", 3], ["Restricted", 2], ["Public", 1], ["Top Secret", critTier === 1 ? 1 : 0]]),
      containsPii: pii, regulatoryScope: reg, certifications: certs,
      lastSecurityReview: isoAdd(TODAY, -ri(20, 360)), openVulnerabilities: vuln,
      rto: [2, 4, 12, 48][critTier - 1], rpo: [1, 2, 8, 24][critTier - 1],
      hasBackup: pickW([["Yes", 9], ["No", 1]]),
      backupFrequency: pickW([["Daily", 5], ["Continuous", 2], ["Hourly", 1], ["Weekly", 2]]),
      drAvailability: hasDr, drLocation: hasDr === "Yes" ? pick(["NESR DC — Abu Dhabi", "Azure UAE Central (paired)", "AWS Bahrain", "NESR DC — Dammam"]) : "",
      annualLicenseCost: license, annualMaintCost: maint, tco,
      licenseModel: saas ? pick(["Subscription", "Per Seat", "Concurrent"]) : sclass === "Open Source" ? "Open Source" : pick(["Perpetual", "Subscription", "Per CPU"]),
      seatCount, contractRenewalDate: isoAdd(TODAY, ri(-30, 500)), contractRef: "CTR-" + ri(10000, 99999),
      chargebackMethod: pick(refs.chargebackMethod),
      appVendor: vendorName, vendorContact: vendorName ? "support@" + vendorName.split(/[\s.]/)[0].toLowerCase() + ".com" : "",
      vendorSupportTimings: vendorName ? pick(["24/7", "Business hours GST", "Mon–Fri 09:00–18:00 GST"]) : "",
      vendorSla: vendorName ? pick(["4h response / 24h resolution", "1h response / 8h resolution", "Next business day"]) : "",
      nesrSla: onPrem ? "NESR IT (in-house)" : pickW([["Vendor", 3], ["Shared (NESR + Vendor)", 2], ["NESR IT (in-house)", 1]]),
      supportTier: refs.supportTier[Math.min(3, critTier - 1)], slaAvailability: refs.slaAvailability[Math.min(4, critTier - 1)],
      primarySupportContact: pick(people), escalationContact: pick(people),
      itsmQueue: dept.split(" ")[0].toUpperCase() + "-OPS", monitoringTool: onPrem ? pick(["Splunk", "Nagios", "Datadog"]) : pick(["Datadog", "Dynatrace", "Azure Monitor"]),
      maintenanceWindow: pick(["Sun 02:00–04:00", "Sat 22:00–02:00", "Fri 23:00–01:00", "Daily 03:00–03:30"]),
      businessCriticality: crit, customerFacing: pickW([["No", 4], ["Partially", 2], ["Yes", 1]]),
      totalUserBase: totalUsers,
      businessProcess: pick(["Drilling & Completion", "Well Intervention", "Procure-to-Pay", "Order-to-Cash", "Record-to-Report", "Hire-to-Retire", "Asset Lifecycle", "HSE Reporting", "Field Service Delivery"]),
      strategicAlignment: critTier === 1 ? pick(["Core – Competitive Differentiator", "Important – Operational"]) : pick(refs.strategicAlignment),
      businessValueNotes: "Supports " + dept + " operations; " + (critTier <= 2 ? "outage directly impacts field revenue." : "moderate operational impact if unavailable."),
      upstreamSystems: [], downstreamSystems: [],
      apiMiddleware: pick(["MuleSoft", "Azure API Mgmt", "Kafka", "REST / direct", "—"]),
      ssoProvider: onPrem ? pick(["LDAP", "ADFS", "Azure AD"]) : pick(["Azure AD", "Okta"]),
      sharedInfra: pick(["Shared K8s cluster", "Dedicated VMs", "Vendor-managed", "Shared SQL estate"]),
      dataFlowDoc: rnd() < 0.6 ? "DFD-" + ri(100, 999) : "Not documented",
      integrationComplexity: intc,
      approvalStatus: "Approved", submittedBy: pick(people), submittedDate: isoAdd(goLive, -ri(20, 90)),
      approvedBy: headOfIT, decisionDate: isoAdd(goLive, -ri(1, 18)), decisionNote: "",
    };
  }

  const apps = seeds.slice(0, 36).map((s, i) => buildApp(i, s));

  // Seed some dependency links, then make them bi-directional.
  for (const a of apps) {
    if (rnd() < 0.55) a.upstreamSystems = sample(allNames.filter((n) => n !== a.name), ri(1, 2));
    if (rnd() < 0.45) a.downstreamSystems = sample(allNames.filter((n) => n !== a.name), ri(1, 2));
  }
  const byName = Object.fromEntries(apps.map((a) => [a.name, a]));
  for (const a of apps) {
    for (const up of a.upstreamSystems) { const o = byName[up]; if (o && !o.downstreamSystems.includes(a.name)) o.downstreamSystems.push(a.name); }
    for (const dn of a.downstreamSystems) { const o = byName[dn]; if (o && !o.upstreamSystems.includes(a.name)) o.upstreamSystems.push(a.name); }
  }

  // A handful Pending / Draft / Rejected for the approval workflow.
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
