/* NESR IT Application Registry — dummy data + schema.
   Sets window.NESR = { refs, fields, domains, people, apps }.
   Deterministic (seeded) so the prototype is stable across reloads. */
(function () {
  // ---- seeded PRNG (mulberry32) ----
  let _s = 0x9e3779b9;
  function rnd() { _s |= 0; _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const pickW = (pairs) => { // weighted [[val,w],...]
    const tot = pairs.reduce((s, p) => s + p[1], 0); let r = rnd() * tot;
    for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; } return pairs[0][0];
  };
  const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

  // ---- reference lists (from the workbook) ----
  const refs = {
    classification: ["In-House", "Vendor", "Open Source", "SaaS", "Hybrid"],
    hostingModel: ["On-Premises", "Cloud – Public", "Cloud – Private", "Hybrid", "SaaS"],
    cloudProvider: ["AWS", "Azure", "GCP", "Oracle Cloud", "IBM Cloud", "N/A"],
    architectureType: ["Monolith", "Microservices", "Serverless", "SOA", "Event-Driven", "N/A"],
    status: ["Active", "Under Development", "Under Review", "Sunset", "Decommissioned"],
    reviewFrequency: ["Quarterly", "Bi-Annually", "Annually", "Ad Hoc"],
    dataClassification: ["Public", "Internal", "Confidential", "Restricted", "Top Secret"],
    containsPii: ["Yes", "No", "Partial"],
    regulatoryScope: ["GDPR", "SOX", "HIPAA", "PCI-DSS", "ISO 27001", "NIST", "Multiple", "None"],
    openVulnerabilities: ["None", "Low", "Medium", "High", "Critical"],
    drTier: ["Tier 1 – Mission Critical", "Tier 2 – Business Critical", "Tier 3 – Standard", "Tier 4 – Low"],
    licenseModel: ["Perpetual", "Subscription", "Open Source", "Per Seat", "Per CPU", "Concurrent", "Free"],
    chargebackMethod: ["Central IT", "Department Chargeback", "Shared", "None"],
    supportTier: ["Tier 1 – 24/7 Critical", "Tier 2 – Business Hours", "Tier 3 – Best Effort", "Vendor Only"],
    slaAvailability: ["99.99%", "99.9%", "99.5%", "99%", "95%"],
    monitoringTool: ["Datadog", "Dynatrace", "Splunk", "Nagios", "Azure Monitor", "Custom", "None"],
    businessCriticality: ["Tier 1 – Mission Critical", "Tier 2 – Business Critical", "Tier 3 – Standard", "Tier 4 – Low"],
    customerFacing: ["Yes", "No", "Partially"],
    strategicAlignment: ["Core – Competitive Differentiator", "Important – Operational", "Necessary – Utility", "Under Evaluation"],
    ssoProvider: ["Azure AD", "Okta", "LDAP", "ADFS", "Google Workspace", "None"],
    integrationComplexity: ["Low (1–3)", "Medium (4–10)", "High (10+)"],
  };

  // ---- field schema, grouped into the 8 domains ----
  const domains = [
    { key: "identity", label: "Identity & Ownership", icon: "id", fields: [
      { key: "appId", label: "App ID / CMDB ID" }, { key: "alias", label: "App Alias" },
      { key: "businessOwner", label: "Business Owner" }, { key: "itOwner", label: "IT Owner / Manager" },
      { key: "department", label: "Department" }, { key: "costCentre", label: "Cost Centre" },
      { key: "classification", label: "Classification", ref: "classification" } ] },
    { key: "technical", label: "Technical Profile", icon: "chip", fields: [
      { key: "techStack", label: "Technology Stack" }, { key: "hostingModel", label: "Hosting Model", ref: "hostingModel" },
      { key: "cloudProvider", label: "Cloud Provider", ref: "cloudProvider" }, { key: "architectureType", label: "Architecture Type", ref: "architectureType" },
      { key: "primaryDatabase", label: "Primary Database" }, { key: "currentVersion", label: "Current Version" },
      { key: "integrationCount", label: "Integration Count", num: true } ] },
    { key: "lifecycle", label: "Lifecycle & Status", icon: "cycle", fields: [
      { key: "status", label: "Status", ref: "status" }, { key: "goLiveDate", label: "Go-Live Date", date: true },
      { key: "lastUpgradeDate", label: "Last Upgrade Date", date: true }, { key: "plannedRetirement", label: "Planned Retirement", date: true },
      { key: "vendorEolDate", label: "Vendor EOL Date", date: true }, { key: "nextReviewDate", label: "Next Review Date", date: true },
      { key: "reviewFrequency", label: "Review Frequency", ref: "reviewFrequency" } ] },
    { key: "risk", label: "Risk & Compliance", icon: "shield", fields: [
      { key: "dataClassification", label: "Data Classification", ref: "dataClassification" }, { key: "containsPii", label: "Contains PII", ref: "containsPii" },
      { key: "regulatoryScope", label: "Regulatory Scope", ref: "regulatoryScope" }, { key: "lastSecurityReview", label: "Last Security Review", date: true },
      { key: "openVulnerabilities", label: "Open Vulnerabilities", ref: "openVulnerabilities" }, { key: "drTier", label: "DR Tier", ref: "drTier" },
      { key: "rto", label: "RTO (hrs)", num: true }, { key: "rpo", label: "RPO (hrs)", num: true } ] },
    { key: "financial", label: "Financial & Licensing", icon: "coin", fields: [
      { key: "annualLicenseCost", label: "Annual License Cost ($)", money: true }, { key: "annualMaintCost", label: "Annual Maint. Cost ($)", money: true },
      { key: "tco", label: "TCO ($)", money: true }, { key: "licenseModel", label: "License Model", ref: "licenseModel" },
      { key: "seatCount", label: "Seat Count", num: true }, { key: "contractRenewalDate", label: "Contract Renewal Date", date: true },
      { key: "contractRef", label: "Contract Ref" }, { key: "chargebackMethod", label: "Chargeback Method", ref: "chargebackMethod" } ] },
    { key: "support", label: "Support & Operations", icon: "wrench", fields: [
      { key: "supportTier", label: "Support Tier", ref: "supportTier" }, { key: "slaAvailability", label: "SLA Availability", ref: "slaAvailability" },
      { key: "primarySupportContact", label: "Primary Support Contact" }, { key: "escalationContact", label: "Escalation Contact" },
      { key: "itsmQueue", label: "ITSM Queue" }, { key: "monitoringTool", label: "Monitoring Tool", ref: "monitoringTool" },
      { key: "maintenanceWindow", label: "Maintenance Window" } ] },
    { key: "value", label: "Business Value & Criticality", icon: "star", fields: [
      { key: "businessCriticality", label: "Business Criticality", ref: "businessCriticality" }, { key: "customerFacing", label: "Customer-Facing", ref: "customerFacing" },
      { key: "activeUsers", label: "Active Users", num: true }, { key: "totalUserBase", label: "Total User Base", num: true },
      { key: "businessProcess", label: "Business Process" }, { key: "strategicAlignment", label: "Strategic Alignment", ref: "strategicAlignment" },
      { key: "businessValueNotes", label: "Business Value Notes", long: true } ] },
    { key: "dependencies", label: "Dependencies & Integrations", icon: "link", fields: [
      { key: "upstreamSystems", label: "Upstream Systems" }, { key: "downstreamSystems", label: "Downstream Systems" },
      { key: "apiMiddleware", label: "API / Middleware" }, { key: "ssoProvider", label: "SSO / Identity Provider", ref: "ssoProvider" },
      { key: "sharedInfra", label: "Shared Infra" }, { key: "dataFlowDoc", label: "Data Flow Doc" },
      { key: "integrationComplexity", label: "Integration Complexity", ref: "integrationComplexity" } ] },
  ];

  // ---- people ----
  const people = ["Adnan Khoury", "Sara Haddad", "Mohammed Al-Rashid", "Lina Farouk", "Tariq Mansour",
    "Noura Al-Sabah", "Omar Zaman", "Yasmin Rahimi", "Karim Nasser", "Hala Darwish",
    "Faisal Al-Otaibi", "Reem Saleh", "Bilal Aziz", "Maya Khalil", "Sami Idris", "Dana Aboud"];
  const headOfIT = "Tariq Mujber"; // the approver
  const departments = ["Drilling Operations", "Well Services", "Production Solutions", "Field Engineering",
    "HSE & Compliance", "Supply Chain", "Finance", "Human Resources", "Commercial", "Asset Management",
    "Information Technology", "Legal"];

  // ---- curated app seeds (name, vendor stack, dept, criticalityBias) ----
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
  const fmtMoney = (n) => n;

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
      annualLicenseCost: fmtMoney(license), annualMaintCost: fmtMoney(maint), tco: fmtMoney(tco),
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
    if (st === "Pending") { a.status = "Under Development"; a.approvedBy = ""; a.decisionDate = ""; a.decisionNote = ""; }
    if (st === "Draft") { a.status = "Under Development"; a.approvedBy = ""; a.decisionDate = ""; a.decisionNote = ""; }
    if (st === "Rejected") { a.status = "Under Development"; a.approvedBy = headOfIT; a.decisionDate = isoAdd(TODAY, -ri(1, 6)); a.decisionNote = note; }
  }
  pendize(30, "Pending"); pendize(31, "Pending"); pendize(35, "Pending"); pendize(28, "Pending");
  pendize(26, "Draft"); pendize(22, "Draft");
  pendize(34, "Rejected", "Duplicate of existing VPN Access Gateway capability — consolidate rather than onboard a new tool.");

  window.NESR = { refs, domains, people, departments, headOfIT, apps, today: "2026-06-02" };
})();
