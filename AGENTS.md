# 🤖 Pampa Finance - Agent Instructions

This guide provides context, standards, and commands for AI agents operating in this repository.

## 🏗️ Project Architecture
Pampa Finance is a "Backendless" PWA (Progressive Web App) designed for the Argentine financial market.
- **Frontend:** Vanilla HTML, CSS, and JavaScript. No framework (React/Vue/etc.) is used.
- **Data Sync:** GitHub Actions runs `scripts/fetch_data.js` to populate the `data/` directory with JSON files.
- **Service Layer:** `api-service.js` handles data fetching with local-first logic, live API fallbacks, and CORS proxy rotation.

## 🛠️ Build & Development Commands

### Local Development
The project is static. Use any local server to avoid CORS issues:
- **Python:** `python3 -m http.server 8000`
- **Node.js:** `npx serve .`

### Data Sincronization (Node.js required)
To update the local data cache in the `data/` directory:
- **Update all:** `node scripts/fetch_data.js --all`
- **Update quotes only:** `node scripts/fetch_data.js --quotes`
- **Update agro data:** `node scripts/fetch_data.js --agro`
- **Update rates:** `node scripts/fetch_data.js --rates`

### Testing & Linting
There is no automated test suite (Jest/Mocha) or linter (ESLint) configured.
- **Validation:** Manually check the browser console for errors.
- **JSON Validation:** Ensure any manual changes to `data/*.json` or `manifest.json` are valid JSON.
- **PWA Audit:** Use Lighthouse in Chrome to verify PWA compliance after changes to `sw.js` or `manifest.json`.

## 🎨 Code Style & Guidelines

### 1. JavaScript (Vanilla ES6+)
- **Naming:** 
  - Variables and functions: `camelCase` (e.g., `calculateTea`, `getSmartData`).
  - Constants and Enums: `SCREAMING_SNAKE_CASE` (e.g., `PROXIES`, `URLS`).
  - Objects/Namespaces: `PascalCase` (e.g., `ApiService`, `CalculadoraFinanciera`).
- **Formatting:** 4 spaces for indentation. Use semicolons.
- **Async/Await:** Prefer `async/await` over raw Promises. Always use `try...catch` for network operations.
- **Imports:** The project does not use ES Modules (`import/export`). It relies on script order in HTML and global objects (e.g., `window.ApiService`).
- **DOM Access:** Use `document.getElementById` or `document.querySelector`. Cache frequent DOM references.

### 2. Error Handling
- Use the established pattern in `api-service.js`:
  1. Try local/static data first.
  2. Fallback to live API if data is missing or stale (>10 min).
  3. Use `AbortSignal.timeout` for all fetch calls.
  4. Use `ApiService.fetchWithProxy` to bypass CORS when calling external APIs directly.

### 3. HTML & CSS
- **Styling:** Shared styles are in `shared-styles.css`. Use CSS variables for colors (defined in `:root`).
- **Responsive Design:** Mobile-first approach is mandatory. Test with standard mobile viewports.
- **Accessibility:** Ensure buttons have labels and inputs have associated labels for PWA usability.

### 4. Data Management
- Do **not** commit large or sensitive data to the `data/` directory.
- The `finanzas.json` file is a bundle. If you add a new data source, ensure it's added to the `GROUPS` object in `scripts/fetch_data.js`.

## 📱 Service Worker (sw.js)
- When modifying `sw.js`, increment the `CACHE_NAME` version to force updates on user devices.
- Ensure all critical assets (`index.html`, `shared-styles.css`, `api-service.js`) are in the `PRECACHE_ASSETS` array.

## 📝 Commit Messages
Follow conventional commits:
- `feat:` for new features.
- `fix:` for bug fixes.
- `chore:` for updating data or non-code tasks (e.g., `chore: update financial data`).
- `docs:` for documentation changes.
