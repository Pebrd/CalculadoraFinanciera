# Design Spec: ScreenerArgy "Centro de Control Pro"

**Date:** 2026-03-12
**Project:** Pampa Finance - ScreenerArgy Dashboard
**Objective:** Overhaul the existing `ScreenerArgy.html` to a "Pro" control center with high data density, multimedia integration, and full mobile adaptability.

## 1. Core Architecture
- **Paradigm:** "Backendless" PWA (HTML/CSS/Vanilla JS).
- **Layout Engine:** CSS Grid (Desktop) and CSS Flexbox (Mobile) for a seamless "Adaptive" experience.
- **Data Sources:** 
  - **TradingView Embeds:** High-density widgets for stocks, bonds, and CEDEARs.
  - **YouTube Iframe API:** Dynamic live stream player for finance/news channels.
  - **LocalStorage:** To remember the user's preferred YouTube channel and last viewed section.

## 2. Components

### A. TradingView Panels (Density Focused)
1. **Screener Widget (Main):** Focused on BCBA (Argentina Stocks).
2. **Market Quotes Widget (Bonds):** Dedicated to GD and AL bonds (Sovereign Debt).
3. **Hotlists/Market Quotes (CEDEARs):** Highlighting most active/moved CEDEARs.

### B. Multimedia Selector (YouTube Live)
- **Container:** Persistent iframe on Desktop (top-right), collapsible/top-of-stack on Mobile.
- **Pre-loaded Channels:**
  - **News:** LN+, TN, A24, Canal E.
  - **Digital:** Neura Media.
  - **Brokers:** Bull Market (Bull Morning), Rava Bursátil (Mañana del Mercado).
- **Control:** Fast-switch buttons below the player to update the `src` attribute of the iframe without page reload.

### C. Information Density & Spacing
- Use a **dark theme** (`#131722`) matching TradingView defaults.
- Minimal padding/margins (`5px`) between modules to maximize visible information on 13" laptops.

## 3. Responsive/Adaptive Behavior (Critical)

### Desktop View (1200px+)
- **Layout:** 2.5:1 ratio (Main Grids : Multimedia/News).
- **Screener:** Occupies the largest visual weight (left).
- **Multimedia:** Fixed in the top-right quadrant.

### Tablet View (768px - 1199px)
- **Layout:** 1:1 ratio.
- Multimedia moves to a top horizontal bar or a toggleable sidebar.

### Mobile View (Below 768px)
- **Layout:** Vertical Stack (Column).
- **Priority Order:**
  1. Live Stream Player (Compact).
  2. Screener BCBA (Full-width, scrollable).
  3. Bonds/CEDEARs (Collapsible or Tabbed view).
- **Interaction:** Buttons for YouTube channels will be larger/touch-friendly.

## 4. Implementation Details
- **JS Strategy:** A simple `UIManager` object to handle `iframe.src` updates and tab switching if needed on mobile.
- **CSS Strategy:** Use CSS Variables for colors and shared spacing to maintain consistency with `shared-styles.css`.

## 5. Success Criteria
- User can see live markets and listen to financial commentary simultaneously on desktop.
- No horizontal scrolling on mobile.
- Channel selection is remembered across sessions.
- No dependencies on external JS frameworks (React/Vue).
