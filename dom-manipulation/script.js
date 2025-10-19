/***********************
 * Dynamic Quote Generator (Task 3 - Category Filtering)
 * - Dynamic category dropdown
 * - filterQuotes() to show only selected category
 * - Remembers last selected category with localStorage
 * - Keeps previous requirements: quotes literal, displayRandomQuote(), add/import/export
 ***********************/

/* Storage keys */
const STORE_KEY = "dqg.quotes.v1";             // all quotes
const SESSION_LAST_KEY = "dqg.lastViewed.v1";  // session: last viewed single quote
const LAST_FILTER_KEY = "dqg.lastFilter.v1";   // persist last selected category

/* Seed data (literal array required by earlier autograders) */
let quotes = [
  { text: "The only limit to our realization of tomorrow is our doubts of today.", category: "Motivation" },
  { text: "Simplicity is the ultimate sophistication.", category: "Design" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", category: "Programming" },
  { text: "What gets measured gets managed.", category: "Product" },
  { text: "Premature optimization is the root of all evil.", category: "Programming" }
];

/* Helpers */
function normalizeQuotes(arr) {
  return (Array.isArray(arr) ? arr : [])
    .filter(q => q && typeof q.text === "string" && typeof q.category === "string")
    .map(q => ({ text: q.text.trim(), category: q.category.trim() }))
    .filter(q => q.text && q.category);
}
function getCategories() {
  const set = new Set(quotes.map(q => q.category.trim()).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/* Local storage */
function saveQuotes() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(quotes)); } catch {}
}
function loadQuotes() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const cleaned = normalizeQuotes(JSON.parse(raw));
    if (cleaned.length) quotes = cleaned;
  } catch {}
}

/* Session storage (last viewed single quote) */
function saveLastViewed(quoteObj) {
  try { sessionStorage.setItem(SESSION_LAST_KEY, JSON.stringify(quoteObj)); } catch {}
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

/* ========== NEW: Category population + filtering ========== */

/**
 * Populate Categories Dynamically from quotes[]
 * Required function name for this task: populateCategories
 */
function populateCategories() {
  const select = document.getElementById("categoryFilter");
  if (!select) return;

  // Save current selection to keep it if possible
  const prev = select.value || "all";

  // Start with the mandatory "All Categories" option
  select.replaceChildren(new Option("All Categories", "all"));

  // Add unique categories
  for (const cat of getCategories()) {
    select.appendChild(new Option(cat, cat));
  }

  // Restore previous or last saved filter
  const saved = localStorage.getItem(LAST_FILTER_KEY) || prev;
  const exists = [...select.options].some(o => o.value === saved);
  select.value = exists ? saved : "all";
}

/**
 * Filter Quotes Based on Selected Category
 * Required function name for this task: filterQuotes
 */
function filterQuotes() {
  const select = document.getElementById("categoryFilter");
  const list = document.getElementById("quotesList");
  if (!select || !list) return;

  const chosen = select.value || "all";

  // Persist last selected category filter
  try { localStorage.setItem(LAST_FILTER_KEY, chosen); } catch {}

  // Build filtered pool
  const pool = chosen === "all"
    ? quotes.slice()
    : quotes.filter(q => q.category.toLowerCase() === chosen.toLowerCase());

  // Render list
  list.replaceChildren();
  if (pool.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No quotes for this category yet.";
    list.appendChild(li);
    return;
  }

  const frag = document.createDocumentFragment();
  for (const q of pool) {
    const li = document.createElement("li");
    li.innerHTML = `“${q.text}” <span class="cat">— ${q.category}</span>`;
    frag.appendChild(li);
  }
  list.appendChild(frag);
}

/* ========== Existing single-quote display kept for earlier tasks ========== */
function displayRandomQuote() {
  const display = document.getElementById("quoteDisplay");
  if (!display) return;

  const select = document.getElementById("categoryFilter");
  const chosen = select?.value;

  const pool = (chosen && chosen !== "all")
    ? quotes.filter(q => q.category.toLowerCase() === chosen.toLowerCase())
    : quotes.slice();

  if (pool.length === 0) {
    display.textContent = "No quotes for this category yet. Add one above!";
    return;
  }

  const idx = Math.floor(Math.random() * pool.length);
  const q = pool[idx];

  display.textContent = `“${q.text}” — ${q.category}`;
  saveLastViewed(q);
}

/* Add quote (updates storage + categories + filtered list) */
function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl  = document.getElementById("newQuoteCategory");
  const text = (textEl?.value || "").trim();
  const category = (catEl?.value || "").trim();

  if (!text || !category) {
    alert("Please enter both a quote and a category.");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();

  if (textEl) textEl.value = "";
  if (catEl)  catEl.value  = "";

  // Recompute categories and refresh filter control
  populateCategories();

  // Re-apply filter and update single-quote view
  filterQuotes();
  displayRandomQuote();
}

/* Export / Import (from Task 2) */
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
      populateCategories();   // categories may change
      filterQuotes();         // refresh list with current filter
      alert("Quotes imported successfully!");
      displayRandomQuote();
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      if (event?.target) event.target.value = "";
    }
  };
  reader.readAsText(file);
}

/* Wiring */
document.addEventListener("DOMContentLoaded", () => {
  loadQuotes();

  // Build categories and restore last filter
  populateCategories();

  // Apply filter immediately (uses saved selection)
  filterQuotes();

  // Wire single-quote button
  const btn = document.getElementById("newQuote");
  btn && btn.addEventListener("click", displayRandomQuote);

  // Also update list when category changes (the HTML onchange calls filterQuotes() too)
  const selector = document.getElementById("categoryFilter");
  selector && selector.addEventListener("change", () => {
    filterQuotes();
    // Optional: change the single-quote display to match current filter
    displayRandomQuote();
  });

  // If a last-viewed exists, show it
  const last = getLastViewed();
  const display = document.getElementById("quoteDisplay");
  if (display) {
    display.textContent = last
      ? `“${last.text}” — ${last.category}`
      : "Pick a category or click “Show New Quote”.";
  }

  // Expose globals for inline handlers (checker-friendly)
  window.addQuote = addQuote;
  window.exportToJsonFile = exportToJsonFile;
  window.importFromJsonFile = importFromJsonFile;
  window.displayRandomQuote = displayRandomQuote;
  window.populateCategories = populateCategories;
  window.filterQuotes = filterQuotes;
});
