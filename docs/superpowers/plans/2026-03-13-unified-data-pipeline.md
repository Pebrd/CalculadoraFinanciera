# Data Pipeline Unification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create unified data pipeline that updates ALL data every 15 minutes and displays freshness indicators across the entire site.

**Architecture:** Single Python script fetches all data sources and saves to a unified JSON bundle. GitHub Actions runs it every 15 minutes. Frontend reads from bundle with freshness indicators.

**Tech Stack:** Python (yfinance, requests), GitHub Actions, JSON bundle

---

## Task 1: Create unified data fetcher

**Files:**
- Modify: `scripts/fetch_yfinance_data.py`

- [ ] **Step 1: Expand fetch_yfinance_data.py to include all data sources**

```python
#!/usr/bin/env python3
"""
Unified Data Fetcher
Fetches all financial data from multiple sources
"""

import yfinance as yf
import json
import datetime
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

DATA_DIR = Path(__file__).parent.parent / "data"

# YFinance - Argentina stocks
ARGENTINA_STOCKS = {
    "GGAL.BA": "Grupo Financiero Galicia",
    "YPFD.BA": "YPF",
    "PAMP.BA": "Pampa Energía",
    "TECO2.BA": "Telecom Argentina",
    "BBVA.BA": "BBVA Argentina",
    "SUPV.BA": "Grupo Supervielle",
    "BMA.BA": "Banco Macro",
    "CEPU.BA": "Central Puerto",
    "MIRG.BA": "Mirgor",
    "LOMA.BA": "Loma Negra",
    "ALUA.BA": "Aluminio",
    "TXAR.BA": "Ternium Argentina",
    "EDN.BA": "Edenor",
    "CRES.BA": "Cresud",
    "AGRO.BA": "Agro",
    "TGSU2.BA": "TGS",
    "MOLI.BA": "Molinos",
    "CECO2.BA": "Ceco2"
}

# YFinance - Commodities
COMMODITIES = {
    "GC=F": "Gold",
    "CL=F": "WTI Crude Oil",
    "BZ=F": "Brent Crude",
    "ZS=F": "Soybeans",
    "ZC=F": "Corn",
    "ZW=F": "Wheat"
}

# YFinance - Indices
INDICES = {
    "^MERV": "MERVAL Argentina"
}

def fetch_yfinance_data(symbols, name_prefix=""):
    """Fetch data from yfinance for multiple symbols"""
    data = {}
    for symbol, name in symbols.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d")
            if not hist.empty and len(hist) >= 2:
                last_price = hist['Close'].iloc[-1]
                prev_price = hist['Close'].iloc[-2]
                change = last_price - prev_price
                pct_change = (change / prev_price) * 100 if prev_price != 0 else 0
                data[symbol] = {
                    "name": name_prefix + name if name_prefix else name,
                    "price": round(last_price, 2),
                    "change": round(change, 2),
                    "pct_change": round(pct_change, 2),
                    "timestamp": datetime.datetime.now().isoformat()
                }
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
    return data

def fetch_dolar_api():
    """Fetch dolarapi.com data"""
    try:
        resp = requests.get("https://dolarapi.com/v1/dolares", timeout=10)
        if resp.ok:
            data = {}
            for item in resp.json():
                nombre = item.get("nombre", "")
                compra = item.get("compra", 0)
                venta = item.get("venta", 0)
                variacion = item.get("variacion", 0)
                
                key = nombre.lower().replace(" ", "")
                data[key] = {
                    "name": nombre,
                    "buy": compra,
                    "sell": venta,
                    "variacion": variacion,
                    "timestamp": datetime.datetime.now().isoformat()
                }
            return data
    except Exception as e:
        print(f"Error fetching dolar API: {e}")
    return {}

def fetch_criptoya_bancos():
    """Fetch criptoya.com bancos data"""
    try:
        resp = requests.get("https://criptoya.com/api/bancostodos", timeout=10)
        if resp.ok:
            data = resp.json()
            return {"timestamp": datetime.datetime.now().isoformat(), "data": data}
    except Exception as e:
        print(f"Error fetching criptoya bancos: {e}")
    return {}

def fetch_criptoya_usdt():
    """Fetch criptoya.com USDT data"""
    try:
        resp = requests.get("https://criptoya.com/api/usdt/ars/0.1", timeout=10)
        if resp.ok:
            data = resp.json()
            return {"timestamp": datetime.datetime.now().isoformat(), "data": data}
    except Exception as e:
        print(f"Error fetching criptoya USDT: {e}")
    return {}

def main():
    """Main function to fetch and save all data"""
    DATA_DIR.mkdir(exist_ok=True)
    
    print("Fetching yfinance data...")
    stocks = fetch_yfinance_data(ARGENTINA_STOCKS)
    commodities = fetch_yfinance_data(COMMODITIES)
    indices = fetch_yfinance_data(INDICES)
    
    print("Fetching external APIs...")
    dolares = fetch_dolar_api()
    bancos = fetch_criptoya_bancos()
    usdt = fetch_criptoya_usdt()
    
    # Create unified bundle
    bundle = {
        "last_updated": datetime.datetime.now().isoformat(),
        "data": {
            "yfinance_stocks": stocks,
            "yfinance_commodities": commodities,
            "yfinance_indices": indices,
            "dolares": dolares,
            "bancos": bancos,
            "usdt": usdt
        }
    }
    
    # Save unified bundle
    with open(DATA_DIR / "unified_data.json", "w") as f:
        json.dump(bundle, f, indent=2)
    
    # Also save individual files for backward compatibility
    with open(DATA_DIR / "yfinance_stocks.json", "w") as f:
        json.dump(stocks, f, indent=2)
    with open(DATA_DIR / "yfinance_commodities.json", "w") as f:
        json.dump(commodities, f, indent=2)
    with open(DATA_DIR / "yfinance_indices.json", "w") as f:
        json.dump(indices, f, indent=2)
    with open(DATA_DIR / "dolares.json", "w") as f:
        json.dump(dolares, f, indent=2)
    
    print("Data saved to data/ directory")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Update requirements.txt**

Add requests to requirements:
```
yfinance>=0.2.18
pandas>=2.0.0
requests>=2.28.0
```

- [ ] **Step 3: Test script locally**

```bash
pip install requests
python scripts/fetch_yfinance_data.py
```

Expected: Creates unified_data.json with all sources

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch_yfinance_data.py scripts/requirements.txt
git commit -m "feat: create unified data fetcher with all sources"
```

---

## Task 2: Update GitHub Actions workflow

**Files:**
- Modify: `.github/workflows/fetch-financial-data.yml`

- [ ] **Step 1: Update workflow to run unified script**

```yaml
name: Fetch Financial Data

on:
  schedule:
    # Run every 15 minutes during market hours (Argentina time)
    - cron: '0,15,30,45 12-21 * * 1-5'
    - cron: '0 0 * * 1-5'
  workflow_dispatch:

jobs:
  fetch-data:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r scripts/requirements.txt
      
      - name: Run unified data fetcher
        run: python scripts/fetch_yfinance_data.py
      
      - name: Commit and push data files
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add data/*.json
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "chore: update all financial data"
            git push
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/fetch-financial-data.yml
git commit -m "feat: update workflow to run unified data fetcher"
```

---

## Task 3: Add freshness indicator to frontend

**Files:**
- Modify: `scripts/financial-tables.js`
- Modify: `index.html` (add freshness to dollar section)

- [ ] **Step 1: Update financial-tables.js to use unified data with freshness**

```javascript
// Add to financial-tables.js - load from unified bundle
var cacheBust = 't=' + Date.now();

function loadUnifiedData() {
    return fetch('./data/unified_data.json?t=' + Date.now())
        .then(function(res) { return res.json(); })
        .then(function(bundle) {
            window.unifiedBundle = bundle;
            return bundle;
        });
}

// Show freshness indicator
function showFreshness(isoTimestamp, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !isoTimestamp) return;
    
    var date = new Date(isoTimestamp);
    var now = new Date();
    var diff = Math.floor((now - date) / 1000);
    
    var timeStr;
    if (diff < 60) timeStr = 'Hace ' + diff + 's';
    else if (diff < 3600) timeStr = 'Hace ' + Math.floor(diff / 60) + 'min';
    else timeStr = date.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
    
    var indicator = container.querySelector('.freshness-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'freshness-indicator';
        indicator.style.cssText = 'font-size:9px;color:#666;padding:4px 8px;text-align:right;';
        container.insertBefore(indicator, container.firstChild);
    }
    indicator.textContent = '↻ ' + timeStr;
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/financial-tables.js
git commit -m "feat: add freshness indicators to tables"
```

---

## Summary

After implementation:
- All data fetches from 6+ sources in one script
- GitHub Actions runs every 15 min automatically
- Freshness indicators show "Hace X min" on all data
- Single unified bundle for faster loading
