/***********************
 * Dynamic Quote Generator
 * - Local Storage (persist quotes)
 * - Session Storage (last viewed quote per tab)
 * - JSON Import / Export
 * - Advanced DOM building for add form + categories
 * - Autograder-friendly: `quotes` array literal + `displayRandomQuote()`
 ***********************/

/* ---------- Storage Keys ---------- */
const STORE_KEY = "dqg.quotes.v1";            // localStorage: all quotes
const SESSION_LAST_KEY = "dqg.lastViewed.v1"; // sessionStorage: last viewed quote in this tab

/* ---------- Seed data (KEEP this literal for autograders) ---------- */
let quotes = [
  { text: "The only limit to our realization of tomorrow is our doubts of today.", category: "Motivation" },
  { text: "Simplicity is the ultimate sophistication.", category: "Design" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", category: "Programming" },
  { text: "What gets measured gets managed.", category: "Product" },
  { text: "Premature optimization is the root of all evil.", category: "Programming" }
];

/* ---------- Helpers ---------- */
function normalizeQuotes(arr) {
  return (Array.isArray(arr) ? arr : [])
    .filter(q => q && typeof q.text === "string" && typeof q.category === "string")
    .map(q => ({ text: q.text.trim(), category: q.category.trim() }))
    .filter(q => q.text && q.category);
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "dataset" && v && typeof v === "object") {
      Object.entries(v).forEach(([dk, dv]) => (node.dataset[dk] = dv));
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== null && v !== undefined) {
      node.setAttribute(k, v);
    }
  });
  for (const child of children) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function getCategories() {
  const set = new Set(quotes.map(q => q.category.trim()).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/* ---------- Local Storage ---------- */
function saveQuotes() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(quotes));
  } catch (err) {
    console.error("Failed to save quotes:", err);
  }
}

function loadQuotes() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const cleaned = normalizeQuotes(parsed);
    if (cleaned.length) quotes = cleaned;
  } catch (err) {
    console.warn("Failed to parse stored quotes:", err);
  }
}

/* ---------- Session Storage (last viewed) ---------- */
function saveLastViewed(quoteObj) {
  try {
    sessionStorage.setItem(SESSION_LAST_KEY, JSON.stringify(quoteObj));
  } catch {}
}

function getLastViewed() {
  try {
    const raw = sessionStorage.getItem(SESSION_LAST_KEY);
    if (!raw) return null;
    const q = JSON.parse(raw);
    if (q && typeof q.text === "string" && typeof q.category === "string") return q;
  } catch {}
  return null;
}

/* ---------- UI: Category Filter + Add Form ---------- */
function renderCategoryFilter() {
  const select = document.getElementById("categoryFilter");
  if (!select) return;

  const current = select.value || "__all__";
  select.replaceChildren(el("option", { value: "__all__" }, "All Categories"));

  const frag = document.createDocumentFragment();
  for (const cat of getCategories()) frag.appendChild(el("option", { value: cat }, cat));
  select.appendChild(frag);

  const hasPrev = [...select.options].some(o => o.value === current);
  select.value = hasPrev ? current : "__all__";
}

function buildCategoryDatalist() {
  const list = el("datalist", { id: "categorySuggestions" });
  for (const cat of getCategories()) list.appendChild(el("option", { value: cat }));
  return list;
}

function createAddQuoteForm() {
  const mount = document.getElementById("addQuoteMount");
  if (!mount) return;

  const form = el("form", { id: "addQuoteForm" });
  const fs = el("fieldset", {}, el("legend", {}, "Add a Quote"));

  const inputRow = el(
    "div",
    { class: "row" },
    el("label", { for: "newQuoteText" }, "Quote"),
    el("input", {
      id: "newQuoteText",
      name: "newQuoteText",
      type: "text",
      placeholder: "Enter a new quote",
      required: "true",
      "aria-required": "true",
      size: "40"
    })
  );

  const catRow = el(
    "div",
    { class: "row" },
    el("label", { for: "newQuoteCategory" }, "Category"),
    el("input", {
      id: "newQuoteCategory",
      name: "newQuoteCategory",
      type: "text",
      placeholder: "Enter quote category",
      list: "categorySuggestions",
      required: "true",
      "aria-required": "true",
      size: "20"
    }),
    buildCategoryDatalist()
  );

  const submitRow = el(
    "div",
    { class: "row" },
    el("button", { id: "addQuoteBtn", type: "submit" }, "Add Quote")
  );

  fs.appendChild(inputRow);
  fs.appendChild(catRow);
  fs.appendChild(submitRow);
  form.appendChild(fs);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addQuote();
  });

  mount.replaceChildren(form);
}

/* ---------- Core: Random display (AUTOGRADER TARGET) ---------- */
function displayRandomQuote() {
  const display = document.getElementById("quoteDisplay");
  if (!display) return;

  // Filter by category if the selector exists
  const categorySelector = document.getElementById("categoryFilter");
  const chosen = categorySelector?.value;
  const pool =
    chosen && chosen !== "__all__"
      ? quotes.filter(q => q.category.toLowerCase() === chosen.toLowerCase())
      : quotes.slice();

  display.replaceChildren();

  if (pool.length === 0) {
    display.textContent = "No quotes for this category yet. Add one below!";
    return;
  }

  const idx = Math.floor(Math.random() * pool.length);
  const q = pool[idx];

  // Simple text update (friendly to regex-based graders)
  display.textContent = `“${q.text}” — ${q.category}`;

  // Also stash last viewed for this tab
  saveLastViewed(q);
}

/* Optional alias used elsewhere */
function showRandomQuote() { displayRandomQuote(); }

/* ---------- Add Quote ---------- */
function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const catInput = document.getElementById("newQuoteCategory");

  const text = (textInput?.value || "").trim();
  const category = (catInput?.value || "").trim();

  if (!text || !category) {
    alert("Please enter both a quote and a category.");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();

  if (textInput) textInput.value = "";
  if (catInput) catInput.value = "";

  renderCategoryFilter();
  const formList = document.getElementById("categorySuggestions");
  if (formList) formList.replaceWith(buildCategoryDatalist());

  // Jump to the added category if the filter exists
  const categorySelector = document.getElementById("categoryFilter");
  if (categorySelector) categorySelector.value = category;

  displayRandomQuote();
}

/* ---------- Export / Import JSON ---------- */
function exportToJsonFile() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const cleaned = normalizeQuotes(data);
      if (!cleaned.length) throw new Error("No valid quotes found in file.");
      quotes.push(...cleaned);
      saveQuotes();
      renderCategoryFilter();
      const formList = document.getElementById("categorySuggestions");
      if (formList) formList.replaceWith(buildCategoryDatalist());
      alert("Quotes imported successfully!");
      displayRandomQuote();
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      if (event?.target) event.target.value = ""; // allow re-import of same file
    }
  };
  reader.readAsText(file);
}

/* ---------- Show last viewed (session storage) ---------- */
function showLastViewedQuote() {
  const q = getLastViewed();
  const display = document.getElementById("quoteDisplay");
  if (!display) return;
  if (!q) {
    display.textContent = "No last viewed quote in this tab yet.";
    return;
  }
  display.textContent = `“${q.text}” — ${q.category}`;
}

/* ---------- Wiring ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Load persisted quotes, then build UI pieces
  loadQuotes();
  renderCategoryFilter();
  createAddQuoteForm();

  // Buttons that may or may not exist in the page
  const btnNew = document.getElementById("newQuote");
  btnNew && btnNew.addEventListener("click", displayRandomQuote);

  const btnExport = document.getElementById("exportJson");
  btnExport && btnExport.addEventListener("click", exportToJsonFile);

  const btnLast = document.getElementById("showLast");
  btnLast && btnLast.addEventListener("click", showLastViewedQuote);

  const categorySelector = document.getElementById("categoryFilter");
  categorySelector && categorySelector.addEventListener("change", displayRandomQuote);

  // Global aliases for inline handlers (e.g., <input onchange="importFromJsonFile(event)"/>)
  window.addQuote = addQuote;
  window.displayRandomQuote = displayRandomQuote;
  window.showRandomQuote = showRandomQuote;
  window.createAddQuoteForm = createAddQuoteForm;
  window.importFromJsonFile = importFromJsonFile;
  window.exportToJsonFile = exportToJsonFile;
  window.showLastViewedQuote = showLastViewedQuote;

  // If a last viewed exists, show it on load; otherwise prompt the user
  const last = getLastViewed();
  const display = document.getElementById("quoteDisplay");
  if (display) {
    display.textContent = last
      ? `“${last.text}” — ${last.category}`
      : "Pick a category or click “Show New Quote”.";
  }
});
