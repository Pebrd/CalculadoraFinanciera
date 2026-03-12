# 🏦 Pampa Finance - Terminal de Inteligencia Financiera

![Version](https://img.shields.io/badge/version-2.1.0-success)
![Build](https://img.shields.io/github/actions/workflow/status/SantiSanti/CalculadoraFinanciera-main/fetch-data.yml)
![PWA](https://img.shields.io/badge/PWA-Ready-orange)

**Pampa Finance** es una plataforma de análisis y cálculo financiero diseñada para el mercado argentino. Combina una interfaz de usuario minimalista de alta velocidad con un backend automatizado basado en GitHub Actions, garantizando precisión bancaria y disponibilidad constante.

---

## 🛠️ Funcionamiento Técnico (Arquitectura "Backendless")

La plataforma opera bajo un modelo de **Sincronización Asincrónica**:

1.  **Ingesta de Datos (The Worker):** Un flujo de trabajo de GitHub Actions (`scripts/fetch_data.js`) se ejecuta cada hora. Consulta APIs oficiales y privadas (DolarAPI, CriptoYa, AcaBase, BCRA), procesa los JSON y los guarda en la carpeta `/data/`.
2.  **API Service Layer (`api-service.js`):** El frontend no consulta directamente a las APIs externas (evitando errores de CORS y latencia). En su lugar:
    - Intenta cargar el archivo estático desde el repositorio (Velocidad de CDN).
    - Si falla, realiza un fetch en vivo a la API original.
    - Como última instancia, utiliza una rotación de Proxies (CORS-Proxy, AllOrigins).
3.  **PWA & Cache (`sw.js`):** Utiliza Service Workers para cachear activos estáticos y datos financieros. La plataforma es **totalmente funcional offline** con los últimos datos sincronizados.

---

## 📐 Fórmulas y Metodología de Cálculo

Pampa Finance utiliza estándares normativos para sus herramientas de cálculo:

### 1. Inversiones (Plazo Fijo / TNA)
Para la **TEA (Tasa Efectiva Anual)**, implementamos la fórmula de transparencia del BCRA, que contempla la capitalización compuesta sobre subperiodos de 30 días:

$$TEA = \left[ \left( 1 + \frac{TNA \times 30}{365} \right)^{\frac{365}{30}} - 1 \right] \times 100$$

*   **Ganancia Simple:** $Capital \times \left( \frac{TNA}{100} \right) \times \left( \frac{Días}{365} \right)$

### 2. Arbitraje (Bancos vs MEP/Blue)
Calcula el rendimiento neto de un ciclo de compra y venta de divisas:

$$Utilidad = \left( \frac{Capital}{PrecioCompra} \times PrecioVenta \right) - Capital$$

### 3. Dólar Cripto (USDT)
Determina la eficiencia de compra en exchanges y el arbitraje implícito:

*   **Cantidad USDT:** $Capital / PrecioCompra_{ARS}$
*   **Final ARS:** $Cantidad USDT \times PrecioVenta_{ARS}$

### 4. Liquidación de Granos (Agro)
Utiliza los valores de la **Pizarra de Rosario (AcaBase)** en pesos y aplica las Derechos de Exportación (DEX) actuales:

*   **Liquidación Neta:** $(Toneladas \times PrecioPizarra) \times (1 - \frac{DEX}{100})$
*   **Conversión teórica (USD Blend):** $LiquidaciónNeta_{ARS} / DólarBlend$
    *   *Dólar Blend:* Calculado automáticamente como un ponderado (80% Oficial + 20% CCL).

---

## 📊 Fuentes de Información

| Categoría | Proveedor | Frecuencia |
| :--- | :--- | :--- |
| Dólares | DolarAPI.com | 5 min |
| Bancos / USDT | CriptoYa.com | Real-time |
| Granos (Pizarra) | AcaBase | Diario |
| Hacienda | DeCampoACampo (Cañuelas) | Diario |
| Indicadores (IPC/UVA) | ArgentinaDatos / BCRA | Mensual/Diario |

---

## 📱 Instalación

Pampa Finance es una **Progressive Web App**. 
1. Accede desde tu móvil.
2. Selecciona "Compartir" o el menú de tres puntos.
3. Elige **"Agregar a la pantalla de inicio"**.
4. Disfruta de la experiencia de una app nativa sin consumo de almacenamiento excesivo.

---

## 🚀 Características Principales

- **Calculadora de Plazo Fijo**: Simula inversiones con tasas nominales y efectivas (TEA/TNA), incluyendo capitalización compuesta.
- **Dólar MEP vs Blue**: Compara rendimientos entre operaciones bursátiles y cambio paralelo.
- **Dólar Cripto**: Analiza arbitraje entre exchanges y calcula eficiencia de compra en USDT.
- **Liquidación de Granos**: Calcula liquidación neta de trigo, soja, maíz y otros cereales aplicando DEX actuales.
- **Plazo Fijo UVA**: Simula inversiones ajustables por UVA con proyección de interés.
- **Screener Argy**: Dashboard de indicadores financieros argentinos (IPC, UVA, CER, tasas).
- **Noticias Financieras**: feed de noticias del mercado argentino.
- **Gráficos Históricos**: Visualización de evolución de precios del dólar y otras métricas.

---

## 🏗️ Estructura del Proyecto

```
CalculadoraFinanciera-main/
├── index.html              # Página principal
├── plazo-fijo.html        # Calculadora de plazo fijo
├── Hacienda.html          # Liquidación de granos
├── calculadoras.html      # Calculadoras varias
├── tasas.html             # Tasas e indicadores
├── noticias.html          # Noticias financieras
├── ScreenerArgy.html      # Dashboard de indicadores
├── Graficos historicos.html # Gráficos históricos
├── api-service.js         # Capa de servicio de datos
├── sw.js                  # Service Worker para PWA
├── shared-scripts.js      # Utilidades compartidas
├── modern-navigation.js   # Navegación moderna
├── manifest.json          # Manifiesto PWA
├── scripts/
│   └── fetch_data.js      # Script de sincronización de datos
├── data/                  # Datos estáticos (JSON)
│   ├── finanzas.json
│   ├── dolares.json
│   ├── bancostodos.json
│   ├── usdt.json
│   ├── plazofijo.json
│   ├── hacienda.json
│   └── ...
└── README.md
```

---

## 💻 Desarrollo Local

### Requisitos Previos

- Navegador moderno (Chrome, Firefox, Edge, Safari)
- Servidor local (recomendado para evitar problemas de CORS)

### Ejecución Local

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/SantiSanti/CalculadoraFinanciera-main.git
   cd CalculadoraFinanciera-main
   ```

2. **Inicia un servidor local:**
   
   Con Python:
   ```bash
   python -m http.server 8000
   ```
   
   O con Node.js:
   ```bash
   npx serve .
   ```

3. **Abre en el navegador:**
   ```
   http://localhost:8000
   ```

### Actualizar Datos Manualmente

Para sincronizar datos desde la terminal:
```bash
node scripts/fetch_data.js
```

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Para colaborar:

1. **Fork** el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un **Pull Request**

### Buenas Prácticas

- Mantén el código limpio y modular
- Agrega comentarios solo cuando sea necesario para explicar lógica compleja
- Verifica que no haya errores de consola antes de提交
- Prueba la app en dispositivos móviles (PWA)

---

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Esto significa que puedes usar, copiar, modificar y distribuir el software libremente, siempre que incluyas el aviso de licencia.

---

## 🙏 Agradecimientos

- [DolarAPI](https://dolarapi.com) por los tipos de cambio oficiales
- [CriptoYa](https://criptoya.com) por datos de criptomonedas y exchanges
- [AcaBase](https://acabase.com) por la pizarra de granos
- [BCRA](https://bcra.gob.ar) por los indicadores macroeconómicos

---

Desarrollado con precisión para el ecosistema financiero argentino. 🇦🇷
