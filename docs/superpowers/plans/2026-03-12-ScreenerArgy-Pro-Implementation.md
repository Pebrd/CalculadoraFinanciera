# ScreenerArgy "Centro de Control Pro" Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul `ScreenerArgy.html` into a high-density "Pro" dashboard with a live stream selector and adaptive mobile layout.

**Architecture:** A responsive CSS Grid-based dashboard. The "Multimedia" section uses the YouTube Iframe API. TradingView widgets are integrated as standalone iframes for performance. A lightweight `screener-pro.js` handles state and interactivity.

**Tech Stack:** Vanilla HTML, CSS (Grid/Flexbox), JavaScript (ES6+), TradingView Embeds, YouTube Iframe API.

---

## Chunk 1: Layout & Core Structure

### Task 1: HTML Skeleton & CSS Grid
**Files:**
- Create: `ScreenerArgy.html` (Complete replacement)
- Create: `screener-pro.js`

- [ ] **Step 1: Backup current file**
Run: `cp ScreenerArgy.html ScreenerArgy.html.bak`

- [ ] **Step 2: Implement the "Pro" Grid Layout in ScreenerArgy.html**
Write the HTML structure with `<header>`, `<main class="pro-grid">`, and placeholders for `screener-main`, `multimedia-panel`, `bonds-panel`, and `news-panel`.

- [ ] **Step 3: Define "Adaptive" CSS in a `<style>` block**
Implement Desktop Grid (2.5:1 ratio) and Mobile Stack (1 column).

- [ ] **Step 4: Commit skeleton**
Run: `git add ScreenerArgy.html && git commit -m "feat: add pro-grid layout to ScreenerArgy"`

---

## Chunk 2: Multimedia Integration

### Task 2: YouTube Live Selector
**Files:**
- Modify: `ScreenerArgy.html`
- Modify: `screener-pro.js`

- [ ] **Step 1: Create the YouTube Player container**
Add the `<iframe>` placeholder and the `channel-selector` container with buttons.

- [ ] **Step 2: Implement channel switching logic in screener-pro.js**
```javascript
const channels = {
    neura: 'https://www.youtube.com/embed/live_stream?channel=UCv6S_S_S_S_S', // Placeholder IDs
    rava: '...',
    // ... others
};
function switchChannel(id) { ... }
```

- [ ] **Step 3: Add persistence with localStorage**
Save the last chosen channel ID so it loads on refresh.

- [ ] **Step 4: Commit multimedia**
Run: `git add . && git commit -m "feat: implement live stream selector"`

---

## Chunk 3: TradingView & Data

### Task 3: High-Density Widgets
**Files:**
- Modify: `ScreenerArgy.html`

- [ ] **Step 1: Embed TradingView Screener (BCBA)**
Add the script for the "Argentine Market" screener.

- [ ] **Step 2: Embed Market Quotes (Bonds & CEDEARs)**
Add the compact widgets for AL30/GD30 and Most Active CEDEARs.

- [ ] **Step 3: Implement Mobile View optimization**
Ensure widgets scale correctly using `height: 100%` and `min-height` media queries.

- [ ] **Step 4: Final validation & cleanup**
Remove the `.bak` file and verify navigation consistency.

- [ ] **Step 5: Final Commit**
Run: `rm ScreenerArgy.html.bak && git add . && git commit -m "feat: complete Pro Centro de Control implementation"`
