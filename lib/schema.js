/* NESR IT Application Registry — static schema & reference data.
   This is configuration (field definitions, dropdown options, org lists),
   not row data. The application rows live in PostgreSQL, one typed column per
   field. Imported by both the client components, the API and the server-side
   seed script, so it must stay free of `window`, React, and Node-only APIs.

   Field metadata used across the app:
     ref      single-select from refs[ref]
     options  inline single-select list
     multi    multiselect (stored as an array) — pair with ref/options
     apps     multiselect of other applications (array) — bi-directional for
              upstream/downstream
     people   combobox of people (free-add, single value)
     num/money/date/long  input hints
     file     document upload (stored in the documents table, not a column)
     auto     auto-generated, read-only
     showIf   { key, in:[...] } — only shown/relevant when another field matches
     hint     helper text shown under the field
*/

// ---- reference lists (dropdown options) ----
export const refs = {
  sourcing: ["In-House", "Vendor", "Open Source", "Hybrid"],
  hostingModel: ["On-Premises", "On User Computer", "Cloud – Public", "Cloud – Private", "Hybrid", "SaaS"],
  cloudProvider: ["AWS", "Azure", "GCP", "Oracle Cloud", "IBM Cloud", "N/A"],
  status: ["Active", "Under Development", "Under Review", "Sunset", "Decommissioned"],
  reviewFrequency: ["Quarterly", "Bi-Annually", "Annually", "Ad Hoc"],
  dataClassification: ["Public", "Internal", "Confidential", "Restricted", "Top Secret"],
  containsPii: ["Yes", "No", "Partial"],
  regulatoryScope: ["GDPR", "SOX", "HIPAA", "PCI-DSS", "ISO 27001", "NIST", "Multiple", "None"],
  certifications: ["ISO 27001", "ISO 9001", "SOC 1 (SOX 1)", "SOC 2 (SOX 2)", "PCI-DSS", "HIPAA", "GDPR", "NIST", "None"],
  openVulnerabilities: ["None", "Low", "Medium", "High", "Critical"],
  yesNo: ["Yes", "No"],
  backupFrequency: ["Continuous", "Hourly", "Daily", "Weekly", "Monthly", "None"],
  licenseModel: ["Perpetual", "Subscription", "Open Source", "Per Seat", "Per CPU", "Concurrent", "Free"],
  chargebackMethod: ["Central IT", "Department Chargeback", "Shared", "None"],
  supportTier: ["Tier 1 – 24/7 Critical", "Tier 2 – Business Hours", "Tier 3 – Best Effort", "Vendor Only"],
  slaAvailability: ["99.99%", "99.9%", "99.5%", "99%", "95%"],
  nesrSla: ["NESR IT (in-house)", "Vendor", "Shared (NESR + Vendor)"],
  monitoringTool: ["Datadog", "Dynatrace", "Splunk", "Nagios", "Azure Monitor", "Custom", "None"],
  businessCriticality: ["Tier 1 – Mission Critical", "Tier 2 – Business Critical", "Tier 3 – Standard", "Tier 4 – Low"],
  customerFacing: ["Yes", "No", "Partially"],
  strategicAlignment: ["Core – Competitive Differentiator", "Important – Operational", "Necessary – Utility", "Under Evaluation"],
  ssoProvider: ["Azure AD", "Okta", "LDAP", "ADFS", "Google Workspace", "None"],
  integrationComplexity: ["Low (1–3)", "Medium (4–10)", "High (10+)"],
};

// Cost-centre dropdown (code — owning area).
export const costCentres = [
  "CC-1000 — Corporate IT", "CC-2100 — Drilling Operations", "CC-2200 — Well Services",
  "CC-2300 — Production Solutions", "CC-2400 — Field Engineering", "CC-3100 — HSE & Compliance",
  "CC-3200 — Supply Chain", "CC-4100 — Finance", "CC-4200 — Human Resources",
  "CC-5100 — Commercial", "CC-5200 — Asset Management", "CC-6100 — Legal",
];
refs.costCentre = costCentres;

// Hosting models that imply an on-premises footprint (drives conditional fields).
export const ON_PREM_MODELS = ["On-Premises", "Hybrid"];

// ---- field schema, grouped into domains ----
export const domains = [
  { key: "identity", label: "Identity & Ownership", icon: "id", fields: [
    { key: "appId", label: "App ID / CMDB ID", auto: true, hint: "Auto-generated unique identifier for this application." },
    { key: "alias", label: "App Alias", hint: "Short nickname used in dashboards and tables (e.g. WELLVW)." },
    { key: "subDomain", label: "Sub-Domain", hint: "The sub-domain / URL the app is served on, e.g. wellview.nesr.com." },
    { key: "businessOwner", label: "Business Owner", people: true, hint: "Business stakeholder accountable for the application. Pick an existing name or type a new one." },
    { key: "itOwner", label: "Application Manager", people: true, hint: "The IT application manager responsible for running and supporting the application." },
    { key: "country", label: "Country", cascade: "cost", hint: "Country / HQ. Choose Global if it spans all. Filters the company list below." },
    { key: "companyName", label: "Company Name", cascade: "cost", hint: "Legal entity. Choose Global if it spans all companies. Filters department & cost centre." },
    { key: "department", label: "Department", cascade: "cost", hint: "Department within the company. Selecting a department fills its cost centre (and vice-versa)." },
    { key: "costCentre", label: "Cost Centre", cascade: "cost", hint: "Cost centre the application's spend is booked against. 1-to-1 with the department within a company." },
    { key: "sourcing", label: "Sourcing", ref: "sourcing", hint: "How the application was obtained: built in-house, bought from a vendor, or open source." },
  ] },
  { key: "technical", label: "Technical Profile", icon: "chip", fields: [
    { key: "techStack", label: "Technology Stack", hint: "Key languages / frameworks (e.g. React / .NET / SQL Server)." },
    { key: "hostingModel", label: "Deployment / Hosting Type", ref: "hostingModel", hint: "Where it runs: On-Premises, a Cloud model, SaaS, or Hybrid. Drives the On-Premises section." },
    { key: "hostingLocation", label: "Where It Is Hosted", hint: "Region / site it is hosted in, e.g. Azure UAE North, NESR DC Dubai." },
    { key: "hostingService", label: "Hosting Service", hint: "The service/platform used to host it, e.g. Azure App Service, AWS EC2, VMware." },
    { key: "cloudProvider", label: "Cloud Provider", ref: "cloudProvider", hint: "Cloud provider, if applicable." },
    { key: "primaryDatabase", label: "Primary Database", hint: "Main datastore (e.g. PostgreSQL 16, Oracle 19c)." },
    { key: "currentVersion", label: "Current Version", hint: "Version currently in production." },
    { key: "integrationCount", label: "Integration Count", num: true, hint: "Number of systems this application integrates with." },
  ] },
  { key: "onprem", label: "On-Premises Details", icon: "building", showIf: { key: "hostingModel", in: ON_PREM_MODELS },
    hint: "Completed when the application runs (partly) on-premises.", fields: [
    { key: "publicIp", label: "Public IP", hint: "Public IP address, if internet-facing." },
    { key: "onPremLocation", label: "Location", hint: "Data centre / site where the servers live." },
    { key: "serverDetails", label: "Server Details", long: true, hint: "Hostname(s), OS, CPU/RAM, virtual or physical." },
    { key: "dbDetails", label: "DB Details", long: true, hint: "Database server, engine/version, instance name." },
    { key: "serverOwner", label: "Server Owner", people: true, hint: "Who owns / administers the underlying server." },
  ] },
  { key: "lifecycle", label: "Lifecycle & Status", icon: "cycle", fields: [
    { key: "status", label: "Status", ref: "status", hint: "Current lifecycle status of the application." },
    { key: "goLiveDate", label: "Go-Live Date", date: true, hint: "Date the application first went live." },
    { key: "lastUpgradeDate", label: "Last Upgrade Date", date: true, hint: "Date of the most recent upgrade." },
    { key: "plannedRetirement", label: "Planned Retirement", date: true, hint: "Planned decommission date, if any." },
    { key: "vendorEolDate", label: "Vendor EOL Date", date: true, hint: "Vendor end-of-life / end-of-support date." },
    { key: "nextReviewDate", label: "Next Review Date", date: true, hint: "When this record is next due for review." },
    { key: "reviewFrequency", label: "Review Frequency", ref: "reviewFrequency", hint: "How often this application is reviewed." },
  ] },
  { key: "risk", label: "Risk & Compliance", icon: "shield", fields: [
    { key: "dataClassification", label: "Data Classification", ref: "dataClassification", hint: "Highest sensitivity of data the app holds." },
    { key: "containsPii", label: "Contains PII", ref: "containsPii", hint: "Whether it stores personally identifiable information." },
    { key: "regulatoryScope", label: "Regulatory Scope", ref: "regulatoryScope", hint: "Regulations the application falls under." },
    { key: "certifications", label: "Certifications", multi: true, ref: "certifications", hint: "Certifications held by the app / vendor (e.g. ISO 27001, SOC 1, SOC 2). Select all that apply." },
    { key: "lastSecurityReview", label: "Last Security Review", date: true, hint: "Date of the most recent security assessment." },
    { key: "openVulnerabilities", label: "Open Vulnerabilities", ref: "openVulnerabilities", hint: "Severity of currently open security findings." },
    { key: "rto", label: "RTO (hrs)", num: true, hint: "Recovery Time Objective — max acceptable downtime, in hours." },
    { key: "rpo", label: "RPO (hrs)", num: true, hint: "Recovery Point Objective — max acceptable data loss, in hours." },
  ] },
  { key: "resilience", label: "Backup & Disaster Recovery", icon: "layers", fields: [
    { key: "hasBackup", label: "Backup Available", ref: "yesNo", hint: "Is the application / its data backed up?" },
    { key: "backupFrequency", label: "Backup Frequency", ref: "backupFrequency", showIf: { key: "hasBackup", in: ["Yes"] }, hint: "How often backups are taken." },
    { key: "drAvailability", label: "DR Availability", ref: "yesNo", hint: "Is there a Disaster Recovery setup for this application?" },
    { key: "drLocation", label: "DR Location", showIf: { key: "drAvailability", in: ["Yes"] }, hint: "Where the DR environment is located." },
  ] },
  { key: "financial", label: "Financial & Licensing", icon: "coin", fields: [
    { key: "annualLicenseCost", label: "Annual License Cost ($)", money: true, hint: "Yearly licensing cost in USD." },
    { key: "annualMaintCost", label: "Annual Maint. Cost ($)", money: true, hint: "Yearly maintenance / support cost in USD." },
    { key: "tco", label: "TCO ($)", money: true, hint: "Total cost of ownership per year in USD." },
    { key: "licenseModel", label: "License Model", ref: "licenseModel", hint: "How the application is licensed." },
    { key: "seatCount", label: "Seat Count", num: true, hint: "Number of licensed seats." },
    { key: "contractRenewalDate", label: "Contract Renewal Date", date: true, hint: "Next contract renewal date." },
    { key: "contractRef", label: "Contract Ref", hint: "Contract / PO reference number." },
    { key: "chargebackMethod", label: "Chargeback Method", ref: "chargebackMethod", hint: "How cost is charged back to the business." },
  ] },
  { key: "vendor", label: "Vendor & SLA", icon: "building", fields: [
    { key: "appVendor", label: "Application Vendor", hint: "Vendor / supplier of the application (leave blank if built in-house)." },
    { key: "vendorContact", label: "Vendor Contact Details", hint: "Vendor support contact — name, email, phone." },
    { key: "vendorSupportTimings", label: "Vendor Support Timings", hint: "Vendor support hours, e.g. 24/7, Business hours GST." },
    { key: "vendorSla", label: "Vendor SLA", hint: "Service level the vendor commits to (response/resolution)." },
    { key: "nesrSla", label: "Support Handled By (NESR SLA)", ref: "nesrSla", hint: "Whether NESR IT can support this in-house, or the vendor is required." },
  ] },
  { key: "support", label: "Support & Operations", icon: "wrench", fields: [
    { key: "supportTier", label: "Support Tier", ref: "supportTier", hint: "Internal support tier for this application." },
    { key: "slaAvailability", label: "SLA Availability", ref: "slaAvailability", hint: "Target uptime SLA." },
    { key: "primarySupportContact", label: "Primary Support Contact", people: true, hint: "First-line support contact." },
    { key: "escalationContact", label: "Escalation Contact", people: true, hint: "Who to escalate to." },
    { key: "itsmQueue", label: "ITSM Queue", hint: "Ticket queue this app's incidents route to." },
    { key: "monitoringTool", label: "Monitoring Tool", ref: "monitoringTool", hint: "Tool used to monitor the application." },
    { key: "maintenanceWindow", label: "Maintenance Window", hint: "Agreed window for maintenance, e.g. Sun 02:00–04:00." },
  ] },
  { key: "value", label: "Business Value & Criticality", icon: "star", fields: [
    { key: "businessCriticality", label: "Business Criticality", ref: "businessCriticality", hint: "How critical the app is to the business." },
    { key: "customerFacing", label: "Customer-Facing", ref: "customerFacing", hint: "Is it used directly by external customers?" },
    { key: "totalUserBase", label: "Total Users", num: true, hint: "Total number of provisioned users." },
    { key: "businessProcess", label: "Business Process", hint: "Primary business process it supports." },
    { key: "strategicAlignment", label: "Strategic Alignment", ref: "strategicAlignment", hint: "How it aligns to NESR strategy." },
    { key: "businessValueNotes", label: "Business Value Notes", long: true, hint: "Free-text notes on the business value / impact." },
  ] },
  { key: "dependencies", label: "Dependencies & Integrations", icon: "link", fields: [
    { key: "upstreamSystems", label: "Upstream Systems", apps: true, hint: "Applications this one depends on (data flows IN). Links are kept in sync both ways." },
    { key: "downstreamSystems", label: "Downstream Systems", apps: true, hint: "Applications that depend on this one (data flows OUT). Links are kept in sync both ways." },
    { key: "apiMiddleware", label: "API / Middleware", hint: "Integration layer used, e.g. MuleSoft, Azure API Mgmt, Kafka." },
    { key: "ssoProvider", label: "SSO / Identity Provider", ref: "ssoProvider", hint: "How users authenticate to the application." },
    { key: "sharedInfra", label: "Shared Infra", hint: "Shared infrastructure it sits on." },
    { key: "dataFlowDoc", label: "Data Flow Doc", hint: "Reference to a data-flow diagram, if any." },
    { key: "integrationComplexity", label: "Integration Complexity", ref: "integrationComplexity", hint: "Overall complexity of the integrations." },
  ] },
  { key: "documents", label: "Documents", icon: "doc", fields: [
    { key: "documents", label: "Assessments & Documents", file: true, hint: "Upload vendor assessments, security reviews or contracts (PDF, DOCX, XLSX, images)." },
  ] },
];

// ---- org reference lists ----
export const people = ["Adnan Khoury", "Sara Haddad", "Mohammed Al-Rashid", "Lina Farouk", "Tariq Mansour",
  "Noura Al-Sabah", "Omar Zaman", "Yasmin Rahimi", "Karim Nasser", "Hala Darwish",
  "Faisal Al-Otaibi", "Reem Saleh", "Bilal Aziz", "Maya Khalil", "Sami Idris", "Dana Aboud",
  "Tariq Mujber"];
export const departments = ["Drilling Operations", "Well Services", "Production Solutions", "Field Engineering",
  "HSE & Compliance", "Supply Chain", "Finance", "Human Resources", "Commercial", "Asset Management",
  "Information Technology", "Legal"];
refs.department = departments;

// The IT Director / approver (kept as `headOfIT` for backward compatibility).
export const headOfIT = "Tariq Mujber";

// "Today" is pinned so seeded relative dates render meaningfully across the demo.
export const today = "2026-06-02";

// ---- helpers used by the DB layer & CSV export ----
export const fieldDefs = domains.flatMap((d) => d.fields);
export const fieldKeys = fieldDefs.map((f) => f.key);
export const fieldByKey = Object.fromEntries(fieldDefs.map((f) => [f.key, f]));

export const isArrayField = (f) => !!(f.multi || f.apps);
export const isFileField = (f) => !!f.file;

/** SQL column type for a field (file fields live in their own table). */
export function columnType(f) {
  if (f.date) return "DATE";
  if (f.num || f.money) return "NUMERIC";
  if (isArrayField(f)) return "JSONB";
  return "TEXT";
}

// Workflow metadata stored on every application record.
export const workflowKeys = [
  "approvalStatus", "submittedBy", "submittedDate", "approvedBy", "decisionDate", "decisionNote",
];

// All persisted field keys (excluding file uploads and the DB id).
export const persistedFieldKeys = fieldKeys.filter((k) => !fieldByKey[k].file);
export const allKeys = ["name", ...persistedFieldKeys, ...workflowKeys];

// Bundled object mirroring the prototype's `window.NESR`.
export const NESR = {
  refs, costCentres, domains, people, departments, headOfIT, today,
  fieldDefs, fieldKeys, fieldByKey, workflowKeys, allKeys, ON_PREM_MODELS,
};
