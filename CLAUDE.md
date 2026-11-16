# CLAUDE.md

## Purpose
Lantern Row: a free, static, client-side CSV preflight for Shopify-style product CSVs
(single `index.html`, no build, no server). It flags structural problems and heuristics;
it never fixes files and never uploads CSV contents. A separate paid review exists
(linked from the page and README).

## Commands
- `node test.js` : parser/diagnostic checks (extracts the first inline `<script>` of
  `index.html` into a vm sandbox). Must print `PASS n ...` and exit 0.
- Manual UI check: open `index.html` in a browser, click "Try sample CSV", then download
  the PDF and raw CSV. Expect 4 rows, 0 errors, 6 warnings.

## Layout
- `index.html` : page, styles, and scripts. Script 1 holds `csvParse`, `inspect`, render,
  export; later scripts are UI polish, filters, and PDF button.
- `assets/lantern-report.js` : PDF builder (`LanternReport.create`) on top of jsPDF.
- `assets/jspdf.umd.min.js` + `jspdf-LICENSE.txt` : vendored jsPDF 4.2.1; do not edit.
- `assets/sample-preflight-report.pdf` : example report built from synthetic rows.
- `test.js` : Node tests, no dependencies.

## Conventions
- Plain ES, no framework, no bundler; keep everything runnable from `file://`.
- Finding shape: `{severity:"Error"|"Warning", row, field, message}`. `lantern-report.js`
  `profile()` matches on message text, so renaming a message needs a matching edit there.
- Add a `test.js` assertion for every parser/detection change.

## Invariants
- CSV contents never leave the browser. Do not add network calls, analytics, or uploads.
- `row` is the 1-based record position in the file (blank lines count; a quoted multi-line
  field is one record).
- Findings are heuristics. Copy must not promise import success or manual review.
- Pricing and links (CA$29, Whop URL, 100-row limit) must match between `index.html`
  and `README.md`; change them only on the owner's instruction.
- First 120 findings show on screen, 150 in the PDF; the raw CSV export has all.
- Netlify deploys are manual (CLI); a commit here does not publish the site.

## Known gaps (priority order)
1. Only UTF-8 is read (`File.text()`); UTF-16/Latin-1 files are not detected or warned about.
2. Delimiter is fixed to comma; `;` or tab files yield "no Handle column" rather than a
   delimiter hint.
3. Raw CSV export does not neutralize leading `=`,`+`,`-`,`@` in header-derived Field values.
4. Page loads Google Fonts (visitor IP goes to Google; CSV data does not). Self-host to remove.
5. SKU duplicate check is case-sensitive.
6. Whole file is parsed in memory (12 MB cap); 60k rows scans in about 1.5 s.
