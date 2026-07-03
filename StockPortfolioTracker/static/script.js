// =====================================================
// StockTrack — frontend logic
// Talks to the Flask backend via JSON API endpoints:
//   GET  /api/stocks     -> available symbols + fixed prices
//   GET  /api/portfolio  -> current portfolio + summary
//   POST /api/add        -> add a stock entry
//   POST /api/remove     -> remove a single entry
//   POST /api/clear      -> clear the whole portfolio
//   GET  /api/export     -> download portfolio as CSV
// =====================================================

// ----- Cached DOM references -----
const tickerTrackEl = document.getElementById("ticker-track");
const heroPriceListEl = document.getElementById("hero-price-list");
const symbolOptionsEl = document.getElementById("symbol-options");
const symbolHintEl = document.getElementById("symbol-hint");

const addStockForm = document.getElementById("add-stock-form");
const symbolInput = document.getElementById("symbol-input");
const quantityInput = document.getElementById("quantity-input");

const portfolioBodyEl = document.getElementById("portfolio-body");
const emptyRowEl = document.getElementById("empty-row");

const statTotalStocksEl = document.getElementById("stat-total-stocks");
const statTotalSharesEl = document.getElementById("stat-total-shares");
const statTopHoldingEl = document.getElementById("stat-top-holding");
const statTotalValueEl = document.getElementById("stat-total-value");
const footerTotalValueEl = document.getElementById("footer-total-value");

const exportBtn = document.getElementById("export-btn");
const clearBtn = document.getElementById("clear-btn");
const toastContainer = document.getElementById("toast-container");

let currentPortfolioLength = 0;

// ----- Currency formatting helper -----
function formatCurrency(amount) {
  return "$" + Number(amount).toLocaleString("en-US");
}

// ===== Toast notifications =====

function showToast(message, type) {
  const toastEl = document.createElement("div");
  toastEl.className = "toast toast--" + (type === "error" ? "error" : "success") + " align-items-center";
  toastEl.setAttribute("role", "alert");
  toastEl.innerHTML =
    '<div class="d-flex">' +
    '<div class="toast-body">' +
    '<i class="bi ' + (type === "error" ? "bi-x-circle" : "bi-check-circle") + ' me-2"></i>' +
    message +
    "</div>" +
    '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>' +
    "</div>";

  toastContainer.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();

  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// ===== Animated number counter (for the stat cards) =====

function animateValue(el, start, end, formatter) {
  const duration = 600;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = start + (end - start) * eased;
    el.textContent = formatter ? formatter(current) : Math.round(current);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = formatter ? formatter(end) : end;
    }
  }

  requestAnimationFrame(step);
}

// ===== Rendering: ticker tape + hero price list + datalist =====

function renderStockReference(stockPrices) {
  const symbols = Object.keys(stockPrices);

  // Build one set of ticker items, then duplicate it so the
  // CSS marquee animation can loop seamlessly.
  const itemsHtml = symbols
    .map(
      (symbol) =>
        '<span class="ticker__item"><strong>' +
        symbol +
        '</strong> <span class="ticker-up"><i class="bi bi-arrow-up-short"></i>' +
        formatCurrency(stockPrices[symbol]) +
        "</span></span>"
    )
    .join("");

  tickerTrackEl.innerHTML = itemsHtml + itemsHtml;

  // Hero "available symbols" card.
  heroPriceListEl.innerHTML = symbols
    .map(
      (symbol) =>
        "<li><span class=\"symbol\">" +
        symbol +
        '</span><span class="price">' +
        formatCurrency(stockPrices[symbol]) +
        "</span></li>"
    )
    .join("");

  // Datalist suggestions for the symbol input box.
  symbolOptionsEl.innerHTML = symbols
    .map((symbol) => '<option value="' + symbol + '"></option>')
    .join("");

  symbolHintEl.textContent = symbols.join(", ");
}

// ===== Rendering: portfolio table + dashboard cards =====

function renderPortfolio(state) {
  const portfolio = state.portfolio;
  const summary = state.summary;

  // --- Table rows ---
  if (portfolio.length === 0) {
    portfolioBodyEl.innerHTML = "";
    portfolioBodyEl.appendChild(emptyRowEl);
  } else {
    portfolioBodyEl.innerHTML = portfolio
      .map(
        (entry, index) =>
          "<tr>" +
          '<td><span class="symbol-pill">' + entry.symbol + "</span></td>" +
          "<td>" + entry.quantity + "</td>" +
          "<td>" + formatCurrency(entry.price) + "</td>" +
          '<td class="value-cell">' + formatCurrency(entry.value) + "</td>" +
          '<td class="text-end">' +
          '<button type="button" class="remove-btn" data-index="' + index + '" title="Remove">' +
          '<i class="bi bi-x-lg"></i></button>' +
          "</td>" +
          "</tr>"
      )
      .join("");
  }

  // --- Dashboard stat cards (animated count-up) ---
  animateValue(statTotalStocksEl, currentPortfolioLength === portfolio.length ? summary.total_stocks : 0, summary.total_stocks);
  statTotalSharesEl.textContent = summary.total_shares;
  statTopHoldingEl.textContent = summary.top_holding ? summary.top_holding : "—";
  animateValue(statTotalValueEl, 0, summary.total_value, formatCurrency);

  footerTotalValueEl.textContent = formatCurrency(summary.total_value);

  currentPortfolioLength = portfolio.length;
}

// ===== API calls =====

async function loadStockReference() {
  const response = await fetch("/api/stocks");
  const data = await response.json();
  renderStockReference(data.stock_prices);
}

async function loadPortfolio() {
  const response = await fetch("/api/portfolio");
  const state = await response.json();
  renderPortfolio(state);
}

async function addStock(symbol, quantity) {
  const response = await fetch("/api/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol, quantity }),
  });
  const state = await response.json();
  renderPortfolio(state);
  showToast(state.message, state.success ? "success" : "error");
  return state.success;
}

async function removeStock(index) {
  const response = await fetch("/api/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index }),
  });
  const state = await response.json();
  renderPortfolio(state);
  showToast(state.message, state.success ? "success" : "error");
}

async function clearPortfolio() {
  const response = await fetch("/api/clear", { method: "POST" });
  const state = await response.json();
  renderPortfolio(state);
  showToast(state.message, "success");
}

// ===== Event listeners =====

addStockForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const symbol = symbolInput.value.trim();
  const quantity = quantityInput.value;

  // Basic client-side check before hitting the server.
  if (!addStockForm.checkValidity() || !symbol || !quantity) {
    addStockForm.classList.add("was-validated");
    showToast("Please fill in both fields correctly.", "error");
    return;
  }

  const success = await addStock(symbol, quantity);
  if (success) {
    addStockForm.reset();
    addStockForm.classList.remove("was-validated");
    symbolInput.focus();
  }
});

portfolioBodyEl.addEventListener("click", (event) => {
  const btn = event.target.closest(".remove-btn");
  if (!btn) return;
  const index = parseInt(btn.dataset.index, 10);
  removeStock(index);
});

clearBtn.addEventListener("click", () => {
  if (currentPortfolioLength === 0) {
    showToast("Your portfolio is already empty.", "error");
    return;
  }
  if (confirm("Clear your entire portfolio? This cannot be undone.")) {
    clearPortfolio();
  }
});

exportBtn.addEventListener("click", () => {
  if (currentPortfolioLength === 0) {
    showToast("Add at least one stock before exporting.", "error");
    return;
  }
  window.location.href = "/api/export";
});

// Force the symbol input to uppercase as the user types.
symbolInput.addEventListener("input", () => {
  symbolInput.value = symbolInput.value.toUpperCase();
});

// ===== Initial load =====

document.getElementById("footer-year").textContent = new Date().getFullYear();

loadStockReference();
loadPortfolio();
