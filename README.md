# JWB Storage Inventory Dashboard

A static web page (no build step, no backend) that reads a Google Sheet and shows
stock levels, low-stock alerts, a reorder list, Lowe's Pro vs Home Depot Pro
prices, and recent Lowe's orders.

## Files

| File | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | The dashboard |
| `config.js` | Points the dashboard at the Google Sheet |
| `data/snapshot.csv` | Saved copy of the data, shown when the sheet can't be reached |
| `data/sheet-template.csv` | Import this into Google Sheets to create the sheet (formulas included) |

## Set up the Google Sheet

1. In Google Sheets choose **File > Import > Upload** and pick `data/sheet-template.csv`
   (import location: new spreadsheet). Rename the tab to `Inventory`.
2. Fill in the blanks for each item: **Quantity**, **Min Qty**, **Target Qty**,
   **Location**, and **Home Depot Pro Price**.
3. Publish it: **File > Share > Publish to web**, choose the `Inventory` tab and
   **CSV**, click Publish, and copy the link.
4. Paste the link into `publishedCsvUrl` in `config.js`.

To add an item, add a row and copy the formula columns (Status through Est.
Reorder Cost) down from the row above. Column headers are matched by name, so
columns can be reordered, but don't rename them.

`Lowe's Pro Price` is a formula, `(Last Order Line Total − Last Order Discount) ÷
Last Order Qty`, i.e. the net unit price actually paid. For an item with no order
history, type the price over the formula.

## Host it (GitHub Pages)

Repo **Settings > Pages > Build and deployment > Deploy from a branch**, branch
`main`, folder `/ (root)`. The site is then at
`https://<owner>.github.io/<repo>/`; share that link with the team.

Anyone with the page link can see the data, and so can anyone who finds the
sheet's published link.

## Run locally

```
python3 -m http.server 8000
```
then open http://localhost:8000.
