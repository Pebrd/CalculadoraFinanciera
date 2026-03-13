#!/usr/bin/env python3
"""
Unified Data Fetcher
Fetches all financial data from multiple sources + RSS News + Briefing
"""

import yfinance as yf
import json
import datetime
import requests
import feedparser
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

# RSS Feeds - using sources that work without blocking
RSS_FEEDS = {
    "bloomberg": "https://feeds.bloomberg.com/markets/news.rss",
    "reuters": "https://www.reutersagency.com/feed/?best-topics=markets"
}

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

def fetch_yfinance_data(symbols):
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
                    "name": name,
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

def fetch_rss_news():
    """Fetch RSS feeds and return parsed news"""
    all_news = []
    
    for name, url in RSS_FEEDS.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:10]:  # Max 10 per source
                all_news.append({
                    "title": entry.get("title", "")[:200],
                    "link": entry.get("link", ""),
                    "source": name,
                    "published": entry.get("published", "")
                })
        except Exception as e:
            print(f"Error fetching RSS {name}: {e}")
    
    return all_news

def generate_briefing(dolares, indices, commodities, stocks, news):
    """Generate market briefing"""
    
    # Get key data
    merval = indices.get("^MERV", {})
    blue = dolares.get("blue", {})
    oficial = dolares.get("oficial", {})
    
    # Calculate CCL brecha
    ccl = dolares.get("contadoconliquidacion", dolares.get("contadoconliquidez", {}))
    brecha = 0
    if oficial and ccl and oficial.get("sell") and ccl.get("sell"):
        brecha = ((ccl["sell"] / oficial["sell"]) - 1) * 100
    
    # Find biggest movers in commodities
    big_movers = []
    for symbol, data in commodities.items():
        if data.get("pct_change", 0) > 3:
            big_movers.append({"name": data["name"], "change": data["pct_change"]})
    
    # Find biggest stock movers
    stock_movers = []
    for symbol, data in stocks.items():
        if abs(data.get("pct_change", 0)) > 3:
            stock_movers.append({"name": data["name"], "change": data["pct_change"]})
    
    # Top news
    top_news = [n["title"][:100] for n in news[:5]]
    
    briefing = {
        "market": {
            "merval": merval.get("price", 0),
            "merval_change": merval.get("pct_change", 0),
            "blue": blue.get("sell", 0),
            "oficial": oficial.get("sell", 0),
            "brecha": round(brecha, 1)
        },
        "alerts": {
            "commodities": big_movers[:5],
            "stocks": stock_movers[:5]
        },
        "top_news": top_news,
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    return briefing

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
    
    print("Fetching RSS news...")
    news = fetch_rss_news()
    
    print("Generating briefing...")
    briefing = generate_briefing(dolares, indices, commodities, stocks, news)
    
    # Create unified bundle
    bundle = {
        "last_updated": datetime.datetime.now().isoformat(),
        "data": {
            "yfinance_stocks": stocks,
            "yfinance_commodities": commodities,
            "yfinance_indices": indices,
            "dolares": dolares,
            "bancos": bancos,
            "usdt": usdt,
            "news": news,
            "briefing": briefing
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
    with open(DATA_DIR / "news.json", "w") as f:
        json.dump(news, f, indent=2)
    with open(DATA_DIR / "briefing.json", "w") as f:
        json.dump(briefing, f, indent=2)
    
    print("Data saved to data/ directory")

if __name__ == "__main__":
    main()
