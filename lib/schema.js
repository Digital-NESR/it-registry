/* NESR IT Application Registry — static schema & reference data.
   This is configuration (field definitions, dropdown options, org lists),
   not row data. The application rows live in PostgreSQL. Imported by both
   the client components and the server-side seed script, so it must stay
   free of `window`, React, and Node-only APIs. */

// ---- reference lists (dropdown options, from the workbook) ----
export const refs = {
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
export const domains = [
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

// ---- org reference lists ----
export const people = ["Adnan Khoury", "Sara Haddad", "Mohammed Al-Rashid", "Lina Farouk", "Tariq Mansour",
  "Noura Al-Sabah", "Omar Zaman", "Yasmin Rahimi", "Karim Nasser", "Hala Darwish",
  "Faisal Al-Otaibi", "Reem Saleh", "Bilal Aziz", "Maya Khalil", "Sami Idris", "Dana Aboud"];
export const headOfIT = "Tariq Mujber"; // the approver
export const departments = ["Drilling Operations", "Well Services", "Production Solutions", "Field Engineering",
  "HSE & Compliance", "Supply Chain", "Finance", "Human Resources", "Commercial", "Asset Management",
  "Information Technology", "Legal"];

// "Today" is pinned so seeded relative dates (upcoming renewals, overdue
// reviews) render meaningfully and consistently across the demo.
export const today = "2026-06-02";

// Every persisted field key, in domain order — used to build INSERT/UPDATE
// statements and CSV exports without hand-maintaining a parallel list.
export const fieldKeys = domains.flatMap((d) => d.fields.map((f) => f.key));

// Workflow metadata that lives alongside the domain fields on every record.
export const workflowKeys = [
  "approvalStatus", "submittedBy", "submittedDate", "approvedBy", "decisionDate", "decisionNote",
];

// The complete shape of an application record (excluding the DB `id`).
export const allKeys = ["name", ...fieldKeys, ...workflowKeys];

// Bundled object mirroring the prototype's `window.NESR` for easy import.
export const NESR = { refs, domains, people, departments, headOfIT, today, fieldKeys, workflowKeys, allKeys };
