# Import template generator

Regenerates `NESR_IT_Application_Import_Template.xlsx` (repo root) — the Excel workbook
used to bulk-load applications into the registry.

The template has three sheets: **Instructions**, **Applications** (data entry), and a
hidden **Lists** sheet holding the dropdown sources and cascade mapping.

Validation is driven by the live schema (`lib/schema.js`) and the `cost_centers` table:

- Every ref / toggle / Yes-No field becomes a strict dropdown.
- **Country -> Company Name -> Cost Centre** are cascading dependent dropdowns
  (each list is filtered by the previous choice, via named ranges + `INDIRECT`/`MATCH`).
- **Department** auto-fills from the chosen Cost Centre (`INDEX`/`MATCH`, grey column).
- Date fields validate as real dates; cost/number fields require a number >= 0.

Attachments, contacts, AI-model rows, certifications and app-to-app links are **not**
in the template — add them in the app after import (core fields only).

## Regenerate

```bash
# 1. dump schema spec + cost-centre mapping (needs DB creds in .env.local)
node --env-file=.env.local scripts/import-template/dump.mjs
# 2. build the workbook
python scripts/import-template/build.py
```

`spec.json` and `cc.json` are intermediate artifacts (git-ignored).
