(() => {
  const cfg = window.JWB_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const money = (n) => (n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" }));
  const int = (n) => (n == null ? "—" : n.toLocaleString("en-US"));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Sheet header (normalized: lowercase letters/digits only) -> field name.
  const COLS = {
    itemid: "id", itemname: "name", category: "category", location: "location",
    quantity: "qty", unit: "unit", minqty: "min", targetqty: "target",
    lowesproprice: "lowes", homedepotproprice: "hd", lowesitem: "lowesSku",
    homedepotskulink: "hdSku", lastupdated: "updated", notes: "notes",
    lastorderdate: "orderDate", lastorderqty: "orderQty",
    lastorderlinetotal: "orderTotal", lastorderdiscount: "orderDiscount", lowesorder: "orderNo",
  };

  function parseCsv(text) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = ""; rows.push(row); row = [];
      } else cell += c;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  const num = (v) => {
    if (v == null) return null;
    const s = String(v).replace(/[$,\s]/g, "");
    if (s === "") return null;
    const n = parseFloat(s);
    return Number.isNaN(n) ? null : n;
  };

  function toItems(rows) {
    if (!rows.length) return [];
    const keys = rows[0].map((h) => COLS[h.toLowerCase().replace(/[^a-z0-9]/g, "")]);
    return rows.slice(1)
      .map((r) => { const o = {}; keys.forEach((k, i) => { if (k) o[k] = (r[i] ?? "").trim(); }); return o; })
      .filter((o) => o.name)
      .map(enrich);
  }

  function enrich(o) {
    const it = { ...o };
    it.qty = num(o.qty); it.min = num(o.min); it.target = num(o.target);
    it.lowes = num(o.lowes); it.hd = num(o.hd);
    it.orderQty = num(o.orderQty); it.orderTotal = num(o.orderTotal); it.orderDiscount = num(o.orderDiscount);
    if (it.qty == null) it.status = "Needs count";
    else if (it.qty <= 0) it.status = "Out of stock";
    else if (it.min != null && it.qty <= it.min) it.status = "Low";
    else it.status = "OK";
    const prices = [it.lowes, it.hd].filter((p) => p != null);
    it.best = prices.length ? Math.min(...prices) : null;
    if (prices.length === 2) it.bestStore = it.lowes <= it.hd ? "Lowe's Pro" : "Home Depot Pro";
    else it.bestStore = prices.length === 1 ? (it.lowes != null ? "Need Home Depot price" : "Need Lowe's price") : "";
    it.reorderQty = (it.status === "Low" || it.status === "Out of stock") && it.target != null ? Math.max(0, it.target - (it.qty ?? 0)) : null;
    it.reorderCost = it.reorderQty != null && it.best != null ? it.reorderQty * it.best : null;
    return it;
  }

  const pill = (s) => {
    const cls = { "OK": "ok", "Low": "low", "Out of stock": "out" }[s] || "info";
    return `<span class="pill ${cls}">${esc(s)}</span>`;
  };

  let items = [];
  let sort = { key: "name", dir: 1 };

  function renderKpis() {
    const counted = items.filter((i) => i.qty != null);
    const needsAttention = items.filter((i) => i.status === "Low" || i.status === "Out of stock").length;
    const toOrderCost = items.reduce((a, i) => a + (i.reorderCost || 0), 0);
    const savings = items.reduce((a, i) => a + (i.orderDiscount || 0), 0);
    const noHd = items.filter((i) => i.hd == null).length;
    const k = [
      [int(items.length), "Items tracked"],
      [counted.length ? int(counted.reduce((a, i) => a + i.qty, 0)) : "—", "Units on hand"],
      [int(items.filter((i) => i.status === "Needs count").length), "Need a stock count"],
      [int(needsAttention), "Low or out of stock"],
      [money(toOrderCost), "Est. cost to reorder"],
      [int(noHd), "Missing Home Depot price"],
      [money(savings), "Pro discount on recent orders"],
    ];
    $("#kpis").innerHTML = k.map(([n, l]) => `<div class="kpi"><div class="n">${esc(n)}</div><div class="l">${esc(l)}</div></div>`).join("");
  }

  function sorted(list) {
    const { key, dir } = sort;
    return [...list].sort((a, b) => {
      const x = a[key], y = b[key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
    });
  }

  function th(label, key, numeric) {
    const arrow = sort.key === key ? (sort.dir > 0 ? " ▲" : " ▼") : "";
    return `<th data-sort="${key}" class="${numeric ? "num" : ""}">${label}${arrow}</th>`;
  }

  function renderInventory() {
    const q = $("#q").value.trim().toLowerCase();
    const cat = $("#cat").value, st = $("#status").value;
    const list = sorted(items.filter((i) =>
      (!cat || i.category === cat) && (!st || i.status === st) &&
      (!q || [i.name, i.id, i.location, i.lowesSku, i.hdSku, i.category].some((v) => (v || "").toLowerCase().includes(q)))));
    const head = `<tr>${th("Item", "name")}${th("Category", "category")}${th("Location", "location")}${th("On hand", "qty", 1)}${th("Min", "min", 1)}${th("Status", "status")}${th("Best price", "best", 1)}<th>Best store</th></tr>`;
    const body = list.map((i) => `<tr>
      <td>${esc(i.name)}<div class="id">${esc(i.id)}${i.lowesSku ? " · Lowe's #" + esc(i.lowesSku) : ""}</div></td>
      <td>${esc(i.category)}</td><td>${esc(i.location) || "—"}</td>
      <td class="num">${int(i.qty)} ${i.qty != null ? esc(i.unit) : ""}</td><td class="num">${int(i.min)}</td>
      <td>${pill(i.status)}</td><td class="num">${money(i.best)}</td><td>${esc(i.bestStore) || "—"}</td></tr>`).join("");
    $("#inv").innerHTML = head + (body || `<tr><td colspan="8" class="empty">No items match.</td></tr>`);
  }

  function orderList() { return sorted(items.filter((i) => i.reorderQty > 0)); }

  function renderOrder() {
    const list = orderList();
    const pending = items.filter((i) => i.status === "Needs count").length;
    const head = `<tr><th>Item</th><th class="num">On hand</th><th class="num">Target</th><th class="num">Order qty</th><th>Buy at</th><th class="num">Unit</th><th class="num">Est. cost</th></tr>`;
    const body = list.map((i) => `<tr><td>${esc(i.name)}<div class="id">${esc(i.id)}</div></td>
      <td class="num">${int(i.qty)}</td><td class="num">${int(i.target)}</td><td class="num"><strong>${int(i.reorderQty)}</strong></td>
      <td>${esc(i.bestStore) || "—"}</td><td class="num">${money(i.best)}</td><td class="num">${money(i.reorderCost)}</td></tr>`).join("");
    const empty = pending === items.length && items.length
      ? "Nothing to order yet: no stock counts, minimums or targets are filled in. Enter Quantity, Min Qty and Target Qty in the sheet."
      : "Nothing is at or below its minimum.";
    $("#ord").innerHTML = head + (body || `<tr><td colspan="7" class="empty">${empty}</td></tr>`);
  }

  function renderPrices() {
    const max = Math.max(1, ...items.flatMap((i) => [i.lowes, i.hd]).filter((p) => p != null));
    const bar = (cls, label, p) => p == null ? `<div class="bar-label">${label}: no price</div>`
      : `<div class="bar ${cls}" style="width:${Math.max(2, (p / max) * 100)}%"></div><div class="bar-label">${label} ${money(p)}</div>`;
    const head = `<tr><th>Item</th><th class="bars">Lowe's vs Home Depot</th><th class="num">Difference</th><th>Cheaper</th></tr>`;
    const body = sorted(items).map((i) => {
      const diff = i.lowes != null && i.hd != null ? Math.abs(i.lowes - i.hd) : null;
      return `<tr><td>${esc(i.name)}<div class="id">${esc(i.category)}</div></td>
        <td class="bars">${bar("l", "Lowe's", i.lowes)}${bar("h", "Home Depot", i.hd)}</td>
        <td class="num">${money(diff)}</td><td>${i.bestStore && diff != null ? esc(i.bestStore) : `<span class="pill info">${esc(i.bestStore) || "No prices"}</span>`}</td></tr>`;
    }).join("");
    $("#prc").innerHTML = head + body;
  }

  function renderOrders() {
    const groups = new Map();
    items.filter((i) => i.orderNo).forEach((i) => {
      const g = groups.get(i.orderNo) || { date: i.orderDate, lines: [] };
      g.lines.push(i); groups.set(i.orderNo, g);
    });
    const html = [...groups.entries()].sort((a, b) => (b[1].date || "").localeCompare(a[1].date || "")).map(([no, g]) => {
      const gross = g.lines.reduce((a, i) => a + (i.orderTotal || 0), 0);
      const disc = g.lines.reduce((a, i) => a + (i.orderDiscount || 0), 0);
      const rows = g.lines.map((i) => `<tr><td>${esc(i.name)}<div class="id">Lowe's #${esc(i.lowesSku)}</div></td>
        <td class="num">${int(i.orderQty)}</td><td class="num">${money(i.orderTotal != null && i.orderQty ? i.orderTotal / i.orderQty : null)}</td>
        <td class="num">${money(i.orderDiscount)}</td><td class="num">${money(i.lowes)}</td>
        <td class="num">${money(i.orderTotal != null ? i.orderTotal - (i.orderDiscount || 0) : null)}</td></tr>`).join("");
      return `<div class="order"><h3><span>${esc(g.date)} · Lowe's order ${esc(no)}</span><span>${money(gross - disc)} after ${money(disc)} Pro discount</span></h3>
        <div class="table-wrap"><table><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Discount</th><th class="num">Net unit</th><th class="num">Line total</th></tr>${rows}</table></div></div>`;
    }).join("");
    $("#orders").innerHTML = html || `<p class="hint">No order history in the sheet yet.</p>`;
  }

  function renderAll() {
    renderKpis(); renderInventory(); renderOrder(); renderPrices(); renderOrders();
  }

  function fillCategories() {
    const cur = $("#cat").value;
    const cats = [...new Set(items.map((i) => i.category).filter(Boolean))].sort();
    $("#cat").innerHTML = `<option value="">All categories</option>` + cats.map((c) => `<option>${esc(c)}</option>`).join("");
    $("#cat").value = cats.includes(cur) ? cur : "";
  }

  function liveUrl() {
    if (cfg.publishedCsvUrl) return cfg.publishedCsvUrl;
    if (cfg.sheetId) return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(cfg.sheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cfg.sheetName || "Inventory")}`;
    return "";
  }

  async function fetchCsv(url) {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const t = await r.text();
    if (/^\s*<(!doctype|html)/i.test(t)) throw new Error("Sheet is not public");
    return t;
  }

  async function load() {
    const banner = $("#banner"), source = $("#source");
    banner.hidden = true;
    const url = liveUrl();
    let text, live = false;
    if (url) {
      try { text = await fetchCsv(url); live = true; }
      catch (e) {
        banner.hidden = false;
        banner.textContent = `Couldn't read the Google Sheet (${e.message}). Showing the saved snapshot instead; numbers may be out of date.`;
      }
    } else {
      banner.hidden = false;
      banner.textContent = "No Google Sheet is connected yet. Showing the saved snapshot. Set publishedCsvUrl or sheetId in config.js.";
    }
    if (!text) text = await fetchCsv("data/snapshot.csv");
    items = toItems(parseCsv(text));
    fillCategories();
    renderAll();
    const t = new Date().toLocaleString();
    source.textContent = live ? `Live from Google Sheets · updated ${t}` : `Saved snapshot · loaded ${t}`;
  }

  function csvDownload() {
    const esc2 = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["Item ID", "Item", "On hand", "Target", "Order qty", "Buy at", "Unit price", "Est. cost"],
      ...orderList().map((i) => [i.id, i.name, i.qty, i.target, i.reorderQty, i.bestStore, i.best, i.reorderCost])];
    const blob = new Blob([rows.map((r) => r.map(esc2).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "jwb-to-order.csv"; a.click();
    URL.revokeObjectURL(a.href);
  }

  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((x) => x.setAttribute("aria-selected", x === b));
    document.querySelectorAll(".panel").forEach((p) => { p.hidden = p.id !== "tab-" + b.dataset.tab; });
  }));
  ["#q", "#cat", "#status"].forEach((s) => $(s).addEventListener("input", renderInventory));
  $("#inv").addEventListener("click", (e) => {
    const h = e.target.closest("th[data-sort]"); if (!h) return;
    sort = { key: h.dataset.sort, dir: sort.key === h.dataset.sort ? -sort.dir : 1 };
    renderInventory();
  });
  $("#refresh").addEventListener("click", load);
  $("#dl").addEventListener("click", csvDownload);

  load().catch((e) => { $("#source").textContent = "Failed to load data: " + e.message; });
  if (cfg.refreshSeconds > 0) setInterval(() => load().catch(() => {}), cfg.refreshSeconds * 1000);
})();
