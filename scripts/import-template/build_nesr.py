import json, os, datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.comments import Comment
from openpyxl.drawing.image import Image as XLImage

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, "..", "..")
spec = json.load(open(os.path.join(here, "spec.json"), encoding="utf-8"))
cc   = json.load(open(os.path.join(here, "cc.json"), encoding="utf-8"))
LOGO = os.path.join(root, "public", "nesr-logo-white.png")

countries = cc["countries"]; companies = cc["companies"]
compByCountry = cc["companiesByCountry"]; ccByCompany = cc["ccByCompany"]; ccDept = cc["ccDept"]

# ---- NESR brand tokens ----
GREEN, BLACK, LIGHTGREEN, PALE, GRAY, LIGHTGRAY = "2A7E4F", "1F1F1D", "6AAF8E", "C5E0D2", "58595B", "D1D3D4"
ALT = "EAF4EF"  # light tint of the green palette for alternating data rows (legible over many rows)
F_GREEN = PatternFill("solid", fgColor=GREEN)
F_PALE  = PatternFill("solid", fgColor=PALE)
F_GRAY  = PatternFill("solid", fgColor=GRAY)
F_ALT   = PatternFill("solid", fgColor=ALT)
F_AUTO  = PatternFill("solid", fgColor="EDEFF0")
WHITE_BOLD = Font(name="Arial", bold=True, color="FFFFFF", size=10)
WHITE_TITLE = Font(name="Arial", bold=True, color="FFFFFF", size=15)
DARK_BOLD = Font(name="Arial", bold=True, color=BLACK, size=10)
BODY = Font(name="Arial", color=BLACK, size=10)
META = Font(name="Arial", color="FFFFFF", size=9)
EX_FONT = Font(name="Arial", italic=True, color=GRAY, size=10)
thin = Side(style="thin", color="FFFFFF")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

HEADER_ROW = 4
FIRST = 5          # example row
DATA_ROWS = 300
LAST = FIRST + DATA_ROWS - 1
NCOL = len(spec)
LASTCOL = get_column_letter(NCOL)
TODAY = datetime.date.today().isoformat()

def effective_required(c):
    # department auto-fills from cost centre, so the mandatory input is Cost Centre
    return (c["required"] and c["key"] != "department") or c["key"] == "costCentre"

wb = Workbook()

# ================= Lists sheet (hidden) =================
lists = wb.active; lists.title = "Lists"
col = 1
def write_list(header, values):
    global col
    L = get_column_letter(col)
    lists.cell(row=1, column=col, value=header).font = Font(bold=True)
    vals = list(values) if values else [""]
    for i, v in enumerate(vals):
        lists.cell(row=2 + i, column=col, value=v)
    rng = "Lists!$%s$2:$%s$%d" % (L, L, 1 + len(vals))
    col += 1
    return rng
def add_name(name, ref):
    wb.defined_names.add(DefinedName(name=name, attr_text=ref))

add_name("CountryList", write_list("Countries", countries))
for i, c in enumerate(countries, start=1):
    add_name("coco_%d" % i, write_list("CO:" + c[:20], compByCountry[c]))
add_name("CompanyList", write_list("Companies", companies))
for i, co in enumerate(companies, start=1):
    add_name("cc_%d" % i, write_list("CC:" + co[:20], ccByCompany[co]))
cc_codes = list(ccDept.keys())
add_name("CCcodes", write_list("CC codes", cc_codes))
add_name("CCdepts", write_list("CC depts", [ccDept[k] for k in cc_codes]))
for c in spec:
    if c["type"] == "dropdown":
        add_name("opt_" + c["key"], write_list(c["label"][:28], c["options"] or []))
lists.sheet_state = "hidden"

# ================= Applications sheet =================
ws = wb.create_sheet("Applications", 0)
letters = {c["key"]: get_column_letter(i + 1) for i, c in enumerate(spec)}

# --- brand banner (rows 1-3) ---
ws.merge_cells("A1:%s1" % LASTCOL)
b = ws["A1"]; b.fill = F_GREEN; b.value = "IT Application Registry  —  Migration Template"
b.font = WHITE_TITLE; b.alignment = Alignment(horizontal="left", vertical="center", indent=11)
ws.row_dimensions[1].height = 48
try:
    img = XLImage(LOGO); img.height = 38; img.width = int(img.width * 38 / XLImage(LOGO).height)
    ws.add_image(img, "A1")
except Exception as e:
    print("logo skipped:", e)

ws.merge_cells("A2:%s2" % LASTCOL)
m = ws["A2"]; m.fill = F_GREEN; m.font = META
m.value = "National Energy Services Reunited Corp.  ·  Fill one application per row from row %d  ·  Generated %s" % (FIRST + 1, TODAY)
m.alignment = Alignment(horizontal="left", vertical="center", indent=1)
ws.row_dimensions[2].height = 16

ws.merge_cells("A3:%s3" % LASTCOL)
lg = ws["A3"]; lg.fill = PatternFill("solid", fgColor="FFFFFF")
lg.value = ("Legend:   GREEN header with *  =  mandatory (must be filled)      ·      "
            "GREY header  =  optional      ·      shaded cell  =  auto-filled, do not type")
lg.font = Font(name="Arial", color=GRAY, size=9, italic=True)
lg.alignment = Alignment(horizontal="left", vertical="center", indent=1)
ws.row_dimensions[3].height = 18

# --- column headers (row 4) ---
for i, c in enumerate(spec):
    L = get_column_letter(i + 1)
    cell = ws["%s%d" % (L, HEADER_ROW)]
    req = effective_required(c)
    is_auto = c["type"] == "cascade_dept"
    cell.value = c["label"] + (" *" if req else "")
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = border
    if is_auto:
        cell.fill = F_PALE; cell.font = DARK_BOLD
    elif req:
        cell.fill = F_GREEN; cell.font = WHITE_BOLD
    else:
        cell.fill = F_GRAY; cell.font = WHITE_BOLD
    note = (c.get("hint") or "")
    if is_auto: note = (note + "\nAuto-filled from Cost Centre — do not type.").strip()
    if req: note = (note + "\n(Mandatory)").strip()
    if note: cell.comment = Comment(note, "NESR")
    ws.column_dimensions[L].width = max(13, min(30, len(c["label"]) + 4))
ws.row_dimensions[HEADER_ROW].height = 40
ws.freeze_panes = "A%d" % FIRST

# --- data validation ---
def dv_list(formula, rng):
    dv = DataValidation(type="list", formula1=formula, allow_blank=True, showErrorMessage=True)
    dv.error = "Pick a value from the dropdown list."; dv.errorTitle = "Invalid entry"
    ws.add_data_validation(dv); dv.add(rng)

for i, c in enumerate(spec):
    L = get_column_letter(i + 1)
    rng = "%s%d:%s%d" % (L, FIRST, L, LAST)
    t = c["type"]
    if t == "dropdown":
        dv_list("=opt_" + c["key"], rng)
    elif t == "cascade_country":
        dv_list("=CountryList", rng)
    elif t == "cascade_company":
        dv_list('=INDIRECT("coco_"&MATCH($%s%d,CountryList,0))' % (letters["country"], FIRST), rng)
    elif t == "cascade_cc":
        dv_list('=INDIRECT("cc_"&MATCH($%s%d,CompanyList,0))' % (letters["companyName"], FIRST), rng)
    elif t == "cascade_dept":
        for r in range(FIRST, LAST + 1):
            ws["%s%d" % (L, r)] = '=IFERROR(INDEX(CCdepts,MATCH($%s%d,CCcodes,0)),"")' % (letters["costCentre"], r)
    elif t == "date":
        dv = DataValidation(type="date", operator="between", formula1="DATE(1990,1,1)",
                            formula2="DATE(2100,12,31)", allow_blank=True, showErrorMessage=True)
        dv.error = "Enter a valid date."; dv.errorTitle = "Invalid date"
        ws.add_data_validation(dv); dv.add(rng)
        for r in range(FIRST, LAST + 1):
            ws["%s%d" % (L, r)].number_format = "yyyy-mm-dd"
    elif t == "number":
        dv = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0",
                            allow_blank=True, showErrorMessage=True)
        dv.error = "Enter a number (0 or greater)."; dv.errorTitle = "Invalid number"
        ws.add_data_validation(dv); dv.add(rng)

# --- data-row styling (alternating) + auto column shading ---
for r in range(FIRST, LAST + 1):
    fill = F_ALT if (r - FIRST) % 2 else None
    for i in range(NCOL):
        cl = ws.cell(row=r, column=i + 1)
        cl.font = BODY
        if spec[i]["type"] == "cascade_dept":
            cl.fill = F_AUTO
        elif fill:
            cl.fill = fill

# --- example row (row FIRST) ---
country0 = "United Arab Emirates" if "United Arab Emirates" in countries else countries[0]
company0 = compByCountry[country0][0]; cc0 = ccByCompany[company0][0]
sourcing0 = (next((c for c in spec if c["key"] == "sourcing"), {}).get("options") or [""])[0]
status0 = (next((c for c in spec if c["key"] == "status"), {}).get("options") or [""])[0]
ex = {"name": "Example: Contract Management System", "alias": "CMS",
      "country": country0, "companyName": company0, "costCentre": cc0,
      "sourcing": sourcing0, "status": status0}
for i, c in enumerate(spec):
    L = get_column_letter(i + 1); k = c["key"]; t = c["type"]
    if t == "cascade_dept":
        continue
    if k in ex: val = ex[k]
    elif t == "dropdown": val = (c["options"] or [""])[0]
    elif t == "date": val = "2025-01-15"
    elif t == "number": val = 0
    else: val = ""
    if val != "" or k in ex:
        cell = ws["%s%d" % (L, FIRST)]; cell.value = val; cell.font = EX_FONT
ws["A%d" % FIRST].comment = Comment("EXAMPLE ROW — overwrite or delete before sending back.", "NESR")

# ================= Instructions sheet =================
info = wb.create_sheet("Instructions", 0)
info.sheet_view.showGridLines = False
info.column_dimensions["A"].width = 112
info.merge_cells("A1:A1")
hb = info["A1"]; hb.value = "IT Application Registry — Migration Template"; hb.fill = F_GREEN
hb.font = WHITE_TITLE; hb.alignment = Alignment(horizontal="left", vertical="center", indent=11)
info.row_dimensions[1].height = 48
try:
    img2 = XLImage(LOGO); img2.height = 38; img2.width = int(img2.width * 38 / XLImage(LOGO).height)
    info.add_image(img2, "A1")
except Exception:
    pass
title_f = Font(name="Arial", bold=True, size=13, color=GREEN)
h_f = Font(name="Arial", bold=True, size=11, color=BLACK)
b_f = Font(name="Arial", size=10, color=BLACK)
lines = [
    ("", b_f),
    ("How to fill this workbook", title_f),
    ("1. Go to the 'Applications' tab. Enter one application per row, starting at row %d (row %d is an example — overwrite or delete it)." % (FIRST + 1, FIRST), b_f),
    ("2. GREEN column headers marked with * are MANDATORY. GREY headers are optional. Shaded cells auto-fill — do not type in them.", b_f),
    ("3. Cells with a dropdown arrow only accept values from the list; typed-in values outside the list are rejected.", b_f),
    ("", b_f),
    ("Location fields — fill left to right (they cascade)", h_f),
    ("Country  ->  Company Name (filtered by country)  ->  Cost Centre (filtered by company)  ->  Department (auto-fills from Cost Centre).", b_f),
    ("", b_f),
    ("Field formats", h_f),
    ("Dates: enter as YYYY-MM-DD (e.g. 2025-01-15).   Numbers/costs: digits only, 0 or greater.   Yes/No: pick from the dropdown.", b_f),
    ("", b_f),
    ("Not in this template — added inside the app after migration", h_f),
    ("File attachments, provider/partner contacts, AI provider & model lists, certifications, and upstream/downstream application links.", b_f),
    ("Total Cost of Ownership and the App ID are generated automatically by the system.", b_f),
    ("", b_f),
    ("When you are done, save the file and send it back — it will be loaded straight into the registry.", h_f),
    ("", b_f),
    ("National Energy Services Reunited Corp.   ·   www.nesr.com", Font(name="Arial", size=9, color=GRAY)),
]
r = 2
for txt, f in lines:
    c = info.cell(row=r, column=1, value=txt); c.font = f
    c.alignment = Alignment(wrap_text=True, vertical="top"); r += 1

wb._sheets.sort(key=lambda s: {"Instructions": 0, "Applications": 1, "Lists": 2}.get(s.title, 3))
out = os.path.join(root, "NESR_IT_Application_Migration_Template.xlsx")
wb.save(out)
print("saved:", os.path.abspath(out))
print("columns:", NCOL, "| mandatory:", sum(1 for c in spec if effective_required(c)), "| data rows:", DATA_ROWS)
