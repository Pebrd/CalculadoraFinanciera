# News & Banking Data Fix Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix slow loading of bank dollar data, replace news RSS with free national sources, remove briefing.

**Architecture:** Use local cached data for banks (like we do for other data), add free Argentine RSS feeds (Bae, Cronista), remove briefing generation.

**Tech Stack:** Python (fetch script), JSON, JavaScript

---

## Task 1: Fix Bank Dollar Data Loading (use local cache like other data)

**Files:**
- Modify: `scripts/fetch_yfinance_data.py`
- Modify: `scripts/financial-tables.js` or relevant HTML files

- [ ] **Step 1: Add fetch_criptoya_bancos to the unified bundle**

Update `fetch_yfinance_data.py` to save banks data in the unified bundle:
```python
# Add this after fetching banks
with open(DATA_DIR / "bancostodos.json", "w") as f:
    json.dump(bancos, f, indent=2)
```

- [ ] **Step 2: Modify index.html to use local data first for bank dollar**

In the JavaScript that loads bank dollar data, change to use local cached data immediately instead of waiting for API.

- [ ] **Step 3: Test locally**

Run: `python scripts/fetch_yfinance_data.py`

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch_yfinance_data.py
git commit -m "fix: add banks data to unified bundle for faster loading"
```

---

## Task 2: Replace News RSS with Free Argentine Sources

**Files:**
- Modify: `scripts/fetch_yfinance_data.py`

- [ ] **Step 1: Find working free RSS feeds for Argentine news**

Test these potential feeds:
- BaeNegocios: https://www.baenegocios.com/feed/
- El Cronista: https://www.cronista.com/feed/
- La Nación: https://www.lanacion.com.ar/feed/

- [ ] **Step 2: Update RSS_FEEDS in script**

```python
RSS_FEEDS = {
    "bae": "https://www.baenegocios.com/feed/",
    "cronista": "https://www.cronista.com/feed/",
    # Test and add more
}
```

- [ ] **Step 3: Separate national vs international news**

Update fetch_rss_news() to add "category": "Nacional" or "Internacional" based on source.

- [ ] **Step 4: Run and test**

Run: `python scripts/fetch_yfinance_data.py`

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch_yfinance_data.py data/news.json
git commit -m "fix: add free Argentine RSS feeds, separate national/international"
```

---

## Task 3: Remove Briefing Generation

**Files:**
- Modify: `scripts/fetch_yfinance_data.py`
- Delete: `data/briefing.json`
- Modify: `.github/workflows/fetch-financial-data.yml`

- [ ] **Step 1: Remove briefing generation from script**

Delete the generate_briefing() function and its calls.

- [ ] **Step 2: Remove briefing from bundle**

Remove "briefing" from the unified_data.json output.

- [ ] **Step 3: Update workflow**

Remove briefing.json from the files to commit.

- [ ] **Step 4: Commit**

```bash
git add scripts/fetch_yfinance_data.py .github/workflows/
git commit -m "fix: remove briefing generation"
```

---

## Task 4: Test and Debug

**Files:**
- All modified files

- [ ] **Step 1: Run the fetch script**

Run: `python scripts/fetch_yfinance_data.py`

- [ ] **Step 2: Check news.json format**

Verify news has "category": "Nacional" or "Internacional"

- [ ] **Step 3: Push and test in browser**

- [ ] **Step 4: Fix any issues using systematic-debugging**

---

**Total tasks: 4 major tasks with sub-steps**
