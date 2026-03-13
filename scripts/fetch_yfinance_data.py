#!/usr/bin/env python3
"""
YFinance Data Fetcher
Fetches financial data from Yahoo Finance using yfinance library
"""

import yfinance as yf
import json
import datetime
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

# Merval constituents and Argentina stocks
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
    "LOMA.BA": "Loma Negra"
}

# Commodities symbols
COMMODITIES = {
    "GC=F": "Gold",
    "CL=F": "WTI Crude Oil",
    "BZ=F": "Brent Crude",
    "ZS=F": "Soybeans",
    "ZC=F": "Corn",
    "ZW=F": "Wheat"
}

# Indices
INDICES = {
    "^MERV": "MERVAL Argentina",
    "AGSUSD=X": "Silver"
}

def fetch_stocks_data():
    """Fetch latest prices for Argentina stocks"""
    data = {}
    for symbol, name in ARGENTINA_STOCKS.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d")
            if not hist.empty:
                last_price = hist['Close'].iloc[-1]
                change = last_price - hist['Close'].iloc[-2]
                pct_change = (change / hist['Close'].iloc[-2]) * 100
                data[symbol] = {
                    "name": name,
                    "price": round(last_price, 2),
                    "change": round(change, 2),
                    "pct_change": round(pct_change, 2),
                    "timestamp": datetime.datetime.now().isoformat()
                }
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
    return data

def fetch_commodities_data():
    """Fetch latest prices for commodities"""
    data = {}
    for symbol, name in COMMODITIES.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d")
            if not hist.empty:
                last_price = hist['Close'].iloc[-1]
                change = last_price - hist['Close'].iloc[-2]
                pct_change = (change / hist['Close'].iloc[-2]) * 100
                data[symbol] = {
                    "name": name,
                    "price": round(last_price, 2),
                    "change": round(change, 2),
                    "pct_change": round(pct_change, 2),
                    "timestamp": datetime.datetime.now().isoformat()
                }
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
    return data

def fetch_indices_data():
    """Fetch latest prices for indices"""
    data = {}
    for symbol, name in INDICES.items():
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="5d")
            if not hist.empty:
                last_price = hist['Close'].iloc[-1]
                change = last_price - hist['Close'].iloc[-2]
                pct_change = (change / hist['Close'].iloc[-2]) * 100
                data[symbol] = {
                    "name": name,
                    "price": round(last_price, 2),
                    "change": round(change, 2),
                    "pct_change": round(pct_change, 2),
                    "timestamp": datetime.datetime.now().isoformat()
                }
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
    return data

def main():
    """Main function to fetch and save all data"""
    DATA_DIR.mkdir(exist_ok=True)
    
    print("Fetching Argentina stocks...")
    stocks = fetch_stocks_data()
    with open(DATA_DIR / "yfinance_stocks.json", "w") as f:
        json.dump(stocks, f, indent=2)
    
    print("Fetching commodities...")
    commodities = fetch_commodities_data()
    with open(DATA_DIR / "yfinance_commodities.json", "w") as f:
        json.dump(commodities, f, indent=2)
    
    print("Fetching indices...")
    indices = fetch_indices_data()
    with open(DATA_DIR / "yfinance_indices.json", "w") as f:
        json.dump(indices, f, indent=2)
    
    print("Data saved to data/ directory")

if __name__ == "__main__":
    main()
