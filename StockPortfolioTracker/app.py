"""
Stock Portfolio Tracker - Flask Backend
-----------------------------------------
Handles all the server-side logic:
  - Stores each browser's portfolio in a Flask session
  - Validates stock symbols and quantities
  - Calculates investment value per stock and the portfolio total
  - Exports the current portfolio as a downloadable CSV file

The frontend (templates/index.html + static/script.js) talks to this
file entirely through small JSON API endpoints, so the page never
has to fully reload while you add, remove, or clear stocks.
"""

import csv
import io
from flask import Flask, render_template, request, jsonify, session, Response

app = Flask(__name__)

# Required so Flask can keep a separate portfolio per browser session.
app.secret_key = "stock-portfolio-tracker-secret-key"

# ---------------------------------------------------------------
# HARDCODED STOCK PRICES (the single source of truth for prices)
# ---------------------------------------------------------------
STOCK_PRICES = {
    "AAPL": 180,
    "TSLA": 250,
    "GOOGL": 140,
    "MSFT": 350,
    "AMZN": 130,
}


# ---------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------

def get_portfolio():
    """Return the current portfolio list stored in this browser's session."""
    return session.get("portfolio", [])


def save_portfolio(portfolio):
    """Save the portfolio list back into the session."""
    session["portfolio"] = portfolio
    session.modified = True


def calculate_summary(portfolio):
    """
    Calculate the dashboard summary numbers from the portfolio list.
    Uses a plain for-loop (instead of built-ins) so the calculation
    logic is easy to read and follow.
    """
    total_stocks = len(portfolio)
    total_shares = 0
    total_value = 0
    top_holding = None
    top_value = -1

    for entry in portfolio:
        total_shares += entry["quantity"]
        total_value += entry["value"]

        # Track which single holding has the highest investment value.
        if entry["value"] > top_value:
            top_value = entry["value"]
            top_holding = entry["symbol"]

    return {
        "total_stocks": total_stocks,
        "total_shares": total_shares,
        "total_value": total_value,
        "top_holding": top_holding,
    }


def build_state(message="", success=True):
    """Build the full JSON payload sent back to the frontend after every action."""
    portfolio = get_portfolio()
    return {
        "success": success,
        "message": message,
        "portfolio": portfolio,
        "summary": calculate_summary(portfolio),
    }


# ---------------------------------------------------------------
# PAGE ROUTE
# ---------------------------------------------------------------

@app.route("/")
def index():
    """Render the main dashboard page."""
    return render_template("index.html")


# ---------------------------------------------------------------
# API ROUTES
# ---------------------------------------------------------------

@app.route("/api/stocks", methods=["GET"])
def api_stocks():
    """Return the list of available stock symbols and their fixed prices."""
    return jsonify({"stock_prices": STOCK_PRICES})


@app.route("/api/portfolio", methods=["GET"])
def api_portfolio():
    """Return the current portfolio and summary for this session."""
    return jsonify(build_state())


@app.route("/api/add", methods=["POST"])
def api_add():
    """Validate and add a new stock entry to the portfolio."""
    data = request.get_json(silent=True) or {}

    raw_symbol = data.get("symbol", "")
    raw_quantity = data.get("quantity", "")

    # Clean up the symbol: remove spaces, make it uppercase.
    symbol = str(raw_symbol).strip().upper()

    # ----- Validation -----
    if not symbol:
        return jsonify(build_state("Please enter a stock symbol.", success=False)), 400

    if symbol not in STOCK_PRICES:
        available = ", ".join(STOCK_PRICES.keys())
        message = "Unknown symbol '" + symbol + "'. Choose from: " + available + "."
        return jsonify(build_state(message, success=False)), 400

    # Quantity must be a positive whole number.
    try:
        quantity = int(raw_quantity)
    except (TypeError, ValueError):
        return jsonify(build_state("Quantity must be a whole number.", success=False)), 400

    if quantity <= 0:
        return jsonify(build_state("Quantity must be greater than zero.", success=False)), 400

    # ----- Calculation -----
    price = STOCK_PRICES[symbol]
    value = price * quantity

    entry = {
        "symbol": symbol,
        "quantity": quantity,
        "price": price,
        "value": value,
    }

    portfolio = get_portfolio()
    portfolio.append(entry)
    save_portfolio(portfolio)

    message = "Added " + str(quantity) + " share(s) of " + symbol + " to your portfolio."
    return jsonify(build_state(message))


@app.route("/api/remove", methods=["POST"])
def api_remove():
    """Remove a single stock entry from the portfolio by its index."""
    data = request.get_json(silent=True) or {}
    portfolio = get_portfolio()

    try:
        index = int(data.get("index"))
    except (TypeError, ValueError):
        return jsonify(build_state("Invalid item to remove.", success=False)), 400

    if index < 0 or index >= len(portfolio):
        return jsonify(build_state("That stock no longer exists in your portfolio.", success=False)), 400

    removed = portfolio.pop(index)
    save_portfolio(portfolio)

    message = "Removed " + removed["symbol"] + " from your portfolio."
    return jsonify(build_state(message))


@app.route("/api/clear", methods=["POST"])
def api_clear():
    """Clear the entire portfolio for this session."""
    save_portfolio([])
    return jsonify(build_state("Portfolio cleared."))


@app.route("/api/export", methods=["GET"])
def api_export():
    """Export the current portfolio as a downloadable CSV file."""
    portfolio = get_portfolio()
    summary = calculate_summary(portfolio)

    # Build the CSV content in memory.
    buffer = io.StringIO()
    writer = csv.writer(buffer)

    writer.writerow(["Symbol", "Quantity", "Price (USD)", "Investment Value (USD)"])

    for entry in portfolio:
        writer.writerow([entry["symbol"], entry["quantity"], entry["price"], entry["value"]])

    writer.writerow([])
    writer.writerow(["Total Stocks Added", summary["total_stocks"]])
    writer.writerow(["Total Shares", summary["total_shares"]])
    writer.writerow(["Total Investment Value (USD)", summary["total_value"]])

    csv_data = buffer.getvalue()

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=portfolio_export.csv"},
    )


if __name__ == "__main__":
    app.run(debug=True)
