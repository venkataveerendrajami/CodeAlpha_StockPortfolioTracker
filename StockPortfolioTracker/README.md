# StockTrack — Stock Portfolio Tracker

A full-stack stock portfolio tracker built with **Flask** (backend) and
**Bootstrap 5 + vanilla JavaScript** (frontend). Add your holdings and the
app instantly calculates each position's value and your total investment,
using a fixed set of manually defined stock prices.

![theme](https://img.shields.io/badge/theme-dark%20glassmorphism-7c5cff)

## Project structure

```
StockPortfolioTracker/
│
├── app.py              # Flask backend: routes, validation, calculations, CSV export
├── requirements.txt    # Python dependencies
│
├── templates/
│   └── index.html      # Landing page, dashboard, form, and portfolio table
│
├── static/
│   ├── style.css         # Dark glassmorphism theme, animations, responsiveness
│   └── script.js          # Frontend logic / API calls
│
└── README.md
```

## Features

- **Modern landing page** — glassmorphism cards, gradient blobs, a scrolling
  price ticker, animated stat cards, and a sticky navbar.
- **Add Stock form** — enter a symbol (with autocomplete suggestions) and a
  quantity; both client-side and server-side validation are applied.
- **Hardcoded stock prices** (the single source of truth, in `app.py`):

  | Symbol | Price (USD) |
  |--------|-------------|
  | AAPL   | 180         |
  | TSLA   | 250         |
  | GOOGL  | 140         |
  | MSFT   | 350         |
  | AMZN   | 130         |

- **Live dashboard** — Total Stocks Added, Total Shares, Top Holding, and
  Total Investment Value, all calculated on the backend.
- **Portfolio table** — every holding with its calculated investment value,
  plus a per-row remove button.
- **Export to CSV** — download your current portfolio (with totals) as a
  `.csv` file.
- **Clear Portfolio** — wipes the current session's holdings after a
  confirmation prompt.
- **Toast notifications** — success and error feedback for every action.

## Setup & run

1. (Recommended) create and activate a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate      # on Windows: venv\Scripts\activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run the app:

   ```bash
   python app.py
   ```

4. Open your browser at:

   ```
   http://127.0.0.1:5000
   ```

## API endpoints (used internally by the frontend)

| Method | Endpoint         | Description                                       |
|--------|------------------|----------------------------------------------------|
| GET    | `/`              | Renders the dashboard page                          |
| GET    | `/api/stocks`    | Returns available symbols and their fixed prices     |
| GET    | `/api/portfolio` | Returns the current portfolio and summary            |
| POST   | `/api/add`       | Adds a stock (`{ "symbol": "AAPL", "quantity": 5 }`) |
| POST   | `/api/remove`    | Removes one entry (`{ "index": 0 }`)                 |
| POST   | `/api/clear`     | Clears the entire portfolio                          |
| GET    | `/api/export`    | Downloads the portfolio as a CSV file                |

## Notes

- Each browser session keeps its own portfolio (stored server-side via
  Flask's session), so the calculations always reflect the current user's
  data.
- Prices are intentionally hardcoded (no live market data) to keep the
  project simple and self-contained, as specified in the brief.
- Built as a project for the **CodeAlpha Python Internship Program**.
