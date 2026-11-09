# Lantern Row — Free Shopify CSV Preflight

A free, privacy-first browser tool to flag structural problems in product/supplier CSV files before Shopify imports.

**Try the live free tool:** https://lantern-row-csv-preflight.netlify.app/

**Optional paid second look:** [Lantern Row CSV Check on Whop](https://whop.com/linkedin-com-0cd1/products/lantern-row-csv-check/) — **CA$29 one-time**, an AI-prepared diagnostic for **one Shopify product CSV, up to 100 rows**. Check the live listing for terms and current availability.

## What the free scan checks

- CSV quoting, uneven rows, blank or duplicate headers
- Missing product handles or titles, and duplicate nonblank SKUs
- Suspicious variant prices, compare-at prices and image URLs

Upload a file in the browser, or use **Try sample data** to see example findings. Results are indicative; a report is downloadable locally. The tool **does not upload CSV contents**, fix the file, or guarantee compatibility with your Shopify import workflow. Do not share private merchant data in public GitHub issues.

## Run locally

Open `index.html` directly in a modern browser. No server, login, build step, or external API is required.

Run parser/diagnostic checks from the repository root using Node.js:

```bash
node test.js
```

**Deployment note:** The free site is currently published on Netlify using the CLI, not automatically deployed when this GitHub repository changes. Verify a production deploy separately before claiming that an edit is live.

This is an independent tool and is not affiliated with Shopify.
