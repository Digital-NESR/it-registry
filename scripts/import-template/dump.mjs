import { fieldDefs, refs } from "../../lib/schema.js";
import { query, pool } from "../../lib/db.js";
import { writeFileSync } from "node:fs";

const EXCLUDE = new Set(["appId","tco","certifications","certExpiry","documents","dataFlowDoc",
  "providerContacts","partnerContacts","aiUsed","aiAccess","aiBilling","aiCostCapped","aiCapDetails",
  "promptInjectionHandledBy","promptInjectionControls","aiModels","upstreamSystems","downstreamSystems"]);
const REQUIRED = new Set(["name","businessOwner","itOwner","department","sourcing","hostingModel","status","businessCriticality","dataClassification"]);

const cols = [{ key:"name", label:"Application Name", type:"text", required:true, hint:"Official application name" }];
let cascade=false;
for (const f of fieldDefs) {
  if (EXCLUDE.has(f.key)) continue;
  if (f.cascade) {
    if (!cascade) { cascade=true;
      cols.push({key:"country",label:"Country",type:"cascade_country",required:false,hint:"Pick country (filters Company)"});
      cols.push({key:"companyName",label:"Company Name",type:"cascade_company",required:false,hint:"Pick company (filtered by Country)"});
      cols.push({key:"costCentre",label:"Cost Centre",type:"cascade_cc",required:false,hint:"Pick cost centre (filtered by Company)"});
      cols.push({key:"department",label:"Department",type:"cascade_dept",required:true,hint:"Auto-filled from Cost Centre"});
    }
    continue;
  }
  let type="text", options=null;
  if (f.toggle) { type="dropdown"; options=f.options; }
  else if (f.checkbox) { type="dropdown"; options=["Yes","No"]; }
  else if (f.ref) { type="dropdown"; options=refs[f.ref]||[]; }
  else if (f.date) type="date";
  else if (f.num||f.money) type="number";
  else if (f.long) type="text";
  else type="text";
  cols.push({ key:f.key, label:f.label, type, options, required:REQUIRED.has(f.key), hint:(f.hint||"").slice(0,120) });
}
writeFileSync(new URL("./spec.json", import.meta.url), JSON.stringify(cols, null, 0));

const { rows } = await query("SELECT country, company, department, cost_center AS cc FROM cost_centers WHERE country<>'' AND company<>''");
const countries=[...new Set(rows.map(r=>r.country))].sort();
const companies=[...new Set(rows.map(r=>r.company))].sort();
const companiesByCountry={}; const ccByCompany={}; const ccDept={};
for (const c of countries) companiesByCountry[c]=[];
for (const co of companies) ccByCompany[co]=[];
const seenCoCtry=new Set(), seenCcCo=new Set();
for (const r of rows) {
  const k1=r.country+"|"+r.company; if(!seenCoCtry.has(k1)){seenCoCtry.add(k1); companiesByCountry[r.country].push(r.company);}
  const k2=r.company+"|"+r.cc; if(!seenCcCo.has(k2)){seenCcCo.add(k2); ccByCompany[r.company].push(r.cc);}
  if(!ccDept[r.cc]) ccDept[r.cc]=(r.department||"").trim();
}
for (const c of countries) companiesByCountry[c].sort();
for (const co of companies) ccByCompany[co].sort();
writeFileSync(new URL("./cc.json", import.meta.url), JSON.stringify({countries,companies,companiesByCountry,ccByCompany,ccDept},null,0));
console.log(`spec: ${cols.length} columns | countries ${countries.length} | companies ${companies.length} | cc ${Object.keys(ccDept).length}`);
await pool.end();
