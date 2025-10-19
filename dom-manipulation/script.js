// --- Data & Persistence ------------------------------------------------------

/** Default seed data (used only if nothing in localStorage). */
const DEFAULT_QUOTES = [
    { text: "The only limit to our realization of tomorrow is our doubts of today.", category: "Motivation" },
    { text: "Simplicity is the ultimate sophistication.", category: "Design" },
    { text: "Programs must be written for people to read, and only incidentally for machines to execute.", category: "Programming" },
    { text: "What gets measured gets managed.", category: "Product" },
    { text: "Premature optimization is the root of all evil.", category: "Programming" },
  ];
  
  /** Storage keys */
  const STORE_KEY = "dqg.quotes.v1";
  
  /** Load quotes from storage or seed defaults. */
  function loadQuotes() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [...DEFAULT_QUOTES];
      const parsed = JSON.parse(raw);
      // guard for malformed data
      if (!Array.isArray(parsed)) return [...DEFAULT_QUOTES];
      return parsed.filter(q => q && typeof q.text === "string" && typeof q.category === "string");
    } catch {
      return [...DEFAULT_QUOTES];
    }
  }
  
  /** Save quotes to storage. */
  function saveQuotes() {
    localStorage.setItem(STORE_KEY, JSON.stringify(quotes));
  }
  
  /** In-memory source of truth (mutated by addQuote). */
  let quotes = loadQuotes();
  
  // --- DOM Helpers -------------------------------------------------------------
  
  /** Convenience creator (no innerHTML for safety). */
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
  
  /** Get unique, sorted categories from quotes. */
  function getCategories() {
    const set = new Set(quotes.map(q => q.category.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }
  
  // --- UI Pieces ---------------------------------------------------------------
  
  /** (Step 2) Show a random quote, optionally filtered by category. */
  function showRandomQuote() {
    const display = document.getElementById("quoteDisplay");
    const categorySelector = document.getElementById("categoryFilter");
    const chosen = categorySelector?.value;
  
    const pool =
      chosen && chosen !== "__all__"
        ? quotes.filter(q => q.category.toLowerCase() === chosen.toLowerCase())
        : quotes.slice();
  
    display.replaceChildren(); // clear
  
    if (pool.length === 0) {
      display.appendChild(el("p", {}, "No quotes for this category yet. Add one below!"));
      return;
    }
  
    const idx = Math.floor(Math.random() * pool.length);
    const q = pool[idx];
  
    const card = el(
      "figure",
      { class: "quote-card" },
      el("blockquote", {}, `“${q.text}”`),
      el(
        "figcaption",
        { class: "row" },
        el("span", { class: "badge", "aria-label": "Quote category" }, q.category)
      )
    );
  
    display.appendChild(card);
  }
  
  /** Build / refresh the category <select> dynamically. */
  function renderCategoryFilter() {
    const select = document.getElementById("categoryFilter");
    if (!select) return;
  
    const current = select.value || "__all__";
    // Keep "All Categories" at top
    select.replaceChildren(el("option", { value: "__all__" }, "All Categories"));
  
    const frag = document.createDocumentFragment();
    for (const cat of getCategories()) {
      frag.appendChild(el("option", { value: cat }, cat));
    }
    select.appendChild(frag);
  
    // Try to keep the previous selection if it still exists
    const hasPrev = [...select.options].some(o => o.value === current);
    select.value = hasPrev ? current : "__all__";
  }
  
  /** (Step 2) Create the "Add Quote" form dynamically and attach handlers. */
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
        size: "40",
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
        size: "20",
      }),
      // datalist (category suggestions from current set)
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
  
    // Handle submit via JS (no page reload)
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      addQuote(); // keep API the same as spec snippet
    });
  
    mount.replaceChildren(form);
  }
  
  /** Build the <datalist> for category autocomplete. */
  function buildCategoryDatalist() {
    const list = el("datalist", { id: "categorySuggestions" });
    for (const cat of getCategories()) {
      list.appendChild(el("option", { value: cat }));
    }
    return list;
  }
  
  // --- Actions ----------------------------------------------------------------
  
  /** (Step 3) Add a new quote from inputs and update UI/state. */
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
  
    // Reset inputs
    textInput.value = "";
    catInput.value = "";
  
    // Refresh UI parts dependent on quotes
    renderCategoryFilter();
    // refresh datalist suggestions (rebuild inside the form)
    const form = document.getElementById("addQuoteForm");
    const oldList = document.getElementById("categorySuggestions");
    if (form && oldList) {
      oldList.replaceWith(buildCategoryDatalist());
    }
  
    // Give immediate feedback: show a random in that category if selected or not
    const categorySelector = document.getElementById("categoryFilter");
    if (categorySelector) {
      categorySelector.value = category; // jump to new category
    }
    showRandomQuote();
  }
  
  // --- Wiring -----------------------------------------------------------------
  
  document.addEventListener("DOMContentLoaded", () => {
    // Initial UI
    renderCategoryFilter();
    createAddQuoteForm();
  
    // Button: "Show New Quote"
    const btn = document.getElementById("newQuote");
    btn?.addEventListener("click", showRandomQuote);
  
    // Changing category updates the displayed quote (if any)
    const categorySelector = document.getElementById("categoryFilter");
    categorySelector?.addEventListener("change", showRandomQuote);
  
    // If the static snippet exists and user clicks it, keep it working:
    // (Supports the provided inline onclick="addQuote()" in the brief.)
    window.addQuote = addQuote;
    window.showRandomQuote = showRandomQuote;
    window.createAddQuoteForm = createAddQuoteForm;
  });
  