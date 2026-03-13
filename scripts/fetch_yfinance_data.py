#!/usr/bin/env python3
"""
Unified Data Fetcher
Fetches all financial data from multiple sources + RSS News
"""

import yfinance as yf
import json
import datetime
import requests
import feedparser
import signal
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

MAX_ARTICLES_PER_SOURCE = 10
FETCH_TIMEOUT_SECONDS = 10

# RSS Feeds - Argentine (Nacional) and International (Internacional)
RSS_FEEDS = {
    # Nacional - Argentine financial news
    "el_economista_ultimas": {"url": "https://eleconomista.com.ar/ultimas-noticias/feed/", "category": "Nacional"},
    "el_economista_economia": {"url": "https://eleconomista.com.ar/economia/feed/", "category": "Nacional"},
    "el_economista_finanzas": {"url": "https://eleconomista.com.ar/finanzas/feed/", "category": "Nacional"},
    "el_economista_negocios": {"url": "https://eleconomista.com.ar/negocios/feed/", "category": "Nacional"},
    "el_economista_agro": {"url": "https://eleconomista.com.ar/agro/feed/", "category": "Nacional"},
    # Internacional - International news
    "bloomberg": {"url": "https://feeds.bloomberg.com/markets/news.rss", "category": "Internacional"}
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

def fetch_rss_with_timeout(url, timeout=10):
    """Fetch RSS feed with timeout using signal-based approach"""
    def timeout_handler(signum, frame):
        raise TimeoutError(f"Request timed out after {timeout} seconds")
    
    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout)
    try:
        feed = feedparser.parse(url)
        signal.alarm(0)
        return feed
    finally:
        signal.signal(signal.SIGALRM, old_handler)


def parse_feed_date(entry):
    """Extract publication date from feed entry, return timestamp in milliseconds"""
    for date_field in ("published", "updated", "dc:date"):
        date_str = entry.get(date_field)
        if date_str:
            try:
                parsed = feedparser.parse_datetime(date_str)
                if parsed:
                    return int(parsed.timestamp() * 1000)
            except Exception:
                pass
    return int(datetime.datetime.now().timestamp() * 1000)


def fetch_rss_news():
    """Fetch RSS feeds and return parsed news in compatible format"""
    articles = []
    
    for name, config in RSS_FEEDS.items():
        url = config["url"]
        category = config["category"]
        try:
            feed = fetch_rss_with_timeout(url, FETCH_TIMEOUT_SECONDS)
            for entry in feed.entries[:MAX_ARTICLES_PER_SOURCE]:
                description = entry.get("summary", "") or entry.get("description", "") or ""
                description = description[:300] if description else ""
                articles.append({
                    "source": name.replace("_", " ").title(),
                    "category": category,
                    "title": entry.get("title", "")[:200],
                    "link": entry.get("link", ""),
                    "date": parse_feed_date(entry),
                    "description": description
                })
        except TimeoutError as e:
            print(f"Timeout fetching RSS {name}: {e}")
        except Exception as e:
            print(f"Error fetching RSS {name}: {e}")
    
    return {
        "last_updated": datetime.datetime.now().isoformat(),
        "articles": articles
    }

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
            "news": news
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
