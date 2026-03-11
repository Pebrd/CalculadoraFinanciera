# 🏦 Pampa Finance - Calculadora Financiera & Agro

![Version](https://img.shields.io/badge/version-2.0.0-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Build](https://img.shields.io/github/actions/workflow/status/SantiSanti/CalculadoraFinanciera-main/fetch-data.yml)

Pampa Finance es una plataforma web interactiva y responsive diseñada para centralizar cotizaciones financieras, índices agropecuarios y herramientas de cálculo en tiempo real para el mercado argentino.

## 🚀 Características Principales

- **Cotizaciones en Tiempo Real:** Dólar (Oficial, Blue, MEP, CCL, Cripto), USDT P2P y Tasas de Plazo Fijo.
- **Mercado Agropecuario:** Integración con MatbaRofex y Mercado de Hacienda de Cañuelas.
- **Calculadoras Inteligentes:** 
    - Arbitraje MEP/Blue con selección de proveedores.
    - Dólar Cripto con cálculo de utilidad sobre capital inicial.
    - Liquidación de Granos (Soja, Maíz, Trigo) considerando Retenciones y Dólar Blend (80/20).
    - Inversiones con cálculo de TNA vs TEA (Interés Compuesto).
- **Diseño Ultra-Clean:** Interfaz moderna, modo oscuro forzado y optimización total para móviles.

## 🛠️ Arquitectura Técnica

El proyecto utiliza una arquitectura de **"Static Backend"** para garantizar confiabilidad y velocidad:

1.  **GitHub Actions (The Worker):** Un flujo de trabajo automatizado se ejecuta cada 60 minutos, consulta múltiples APIs (DolarAPI, CriptoYa, ArgentinaDatos, DeCampoACampo) y guarda los resultados como archivos JSON estáticos en el repositorio.
2.  **API Service Layer:** Una capa de abstracción en JavaScript (`api-service.js`) que maneja la lógica de:
    - Priorizar datos estáticos (velocidad de CDN).
    - Fallback a APIs en vivo (si los datos estáticos fallan).
    - Rotación de proxies para evitar bloqueos por CORS.
3.  **Frontend Vanilla:** Construido con HTML5, CSS3 (Variables y Grid) y JS puro para mantener un peso mínimo y máxima compatibilidad.

## 📂 Estructura del Proyecto

```text
├── .github/workflows/  # Automatización de captura de datos
├── data/               # "Base de datos" JSON estática
├── scripts/            # Scripts de Node.js para el fetcher
├── api-service.js      # Cerebro de comunicación con datos
├── shared-styles.css   # Sistema de diseño unificado
├── index.html          # Dashboard de cotizaciones
├── calculadoras.html   # Herramientas de cálculo
└── Hacienda.html       # Datos del mercado agro
```

## 🔧 Instalación y Desarrollo Local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/SantiSanti/CalculadoraFinanciera-main.git
   ```
2. Abrí cualquier archivo `.html` en tu navegador. No requiere un servidor web complejo, pero se recomienda usar la extensión "Live Server" en VS Code.

## 📈 APIs Utilizadas

- **DolarAPI:** Cotizaciones oficiales y paralelas del dólar.
- **CriptoYa:** Precios de USDT en exchanges locales y globales.
- **ArgentinaDatos:** Tasas de Plazo Fijo, FCIs y precios de Pizarra.
- **DeCampoACampo:** Precios del Mercado de Hacienda de Cañuelas.

---
Desarrollado con ❤️ para el ecosistema financiero argentino.
