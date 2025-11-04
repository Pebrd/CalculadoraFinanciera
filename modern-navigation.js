/* ========================================================== */
/* === SISTEMA DE NAVEGACIÓN MODERNO === */
/* ========================================================== */

class ModernNavigation {
  constructor() {
    this.navToggle = null;
    this.navMenu = null;
    this.isOpen = false;
    this.navContainer = null;
    this.init();
  }

  init() {
    this.createNavigation();
    this.bindEvents();
    this.setupIntersectionObserver();
  }

  createNavigation() {
    // Crear contenedor de navegación
    const navContainer = document.createElement('div');
    navContainer.className = 'nav-container';

    // Crear navegación
    const nav = document.createElement('nav');

    // Toggle para móvil
    const navToggle = document.createElement('button');
    navToggle.className = 'nav-toggle';
    navToggle.innerHTML = '<span></span><span></span><span></span>';
    navToggle.setAttribute('aria-label', 'Toggle navigation menu');

    // Brand/Logo
    const brand = document.createElement('a');
    brand.href = 'index.html';
    brand.className = 'nav-brand';
    brand.textContent = 'FinArgy';

    // === MODIFICACIÓN CLAVE: Agrupar Toggle y Brand en un nuevo contenedor ===
    const headerGroup = document.createElement('div');
    headerGroup.className = 'nav-header-group';
    headerGroup.appendChild(navToggle);
    headerGroup.appendChild(brand);
    // =========================================================================

    // Menú de navegación
    const navMenu = document.createElement('ul');
    navMenu.className = 'nav-menu mobile-hidden';

    const menuItems = [
      { href: 'index.html', text: 'Cotizaciones', icon: '📊' },
      { href: 'calculadoras.html', text: 'Calculadoras', icon: '🧮' },
      { href: 'tasas.html', text: 'Tasas', icon: '📈' },
      { href: 'noticias.html', text: 'Noticias', icon: '📰' },
      { href: 'Graficos historicos.html', text: 'Gráficos', icon: '📉' },
      { href: 'Hacienda.html', text: 'Agro', icon: '🌾' },
      { href: 'ScreenerArgy.html', text: 'Argy', icon: '🇦🇷' }
    ];

    menuItems.forEach(item => {
      const li = document.createElement('li');
      li.className = 'nav-item';

      const a = document.createElement('a');
      a.href = item.href;
      a.className = 'nav-link';
      a.innerHTML = `<span class="nav-icon">${item.icon}</span> ${item.text}`;

      // Marcar como activo si coincide con la página actual
      if (a.href === window.location.href ||
        (window.location.pathname.endsWith('/') && item.href === 'index.html')) {
        a.classList.add('active');
        }

        li.appendChild(a);
      navMenu.appendChild(li);
    });


    // Construir estructura: Añadir el grupo y el menú al NAV
    nav.appendChild(headerGroup); // <-- CAMBIO
    nav.appendChild(navMenu);
    navContainer.appendChild(nav);

    // Insertar al inicio del body
    document.body.insertBefore(navContainer, document.body.firstChild);

    // Guardar referencias
    this.navToggle = navToggle;
    this.navMenu = navMenu;
    this.navContainer = navContainer;
  }

  bindEvents() {
    // Toggle del menú móvil
    this.navToggle.addEventListener('click', () => {
      this.toggleMenu();
    });

    // Cerrar menú al hacer clic en un enlace
    this.navMenu.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav-link')) {
        this.closeMenu();
      }
    });

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.navContainer.contains(e.target)) {
        this.closeMenu();
      }
    });

    // Cerrar menú con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMenu();
      }
    });

    // Resize handler
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && this.isOpen) {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  openMenu() {
    this.isOpen = true;
    this.navToggle.classList.add('active');
    this.navMenu.classList.remove('mobile-hidden');
    this.navMenu.classList.add('mobile-visible');
    document.body.style.overflow = 'hidden';

    // Animar enlaces
    const links = this.navMenu.querySelectorAll('.nav-link');
    links.forEach((link, index) => {
      link.style.animationDelay = `${index * 0.1}s`;
      link.classList.add('slide-in-left');
    });
  }

  closeMenu() {
    this.isOpen = false;
    this.navToggle.classList.remove('active');
    this.navMenu.classList.add('mobile-hidden');
    this.navMenu.classList.remove('mobile-visible');
    document.body.style.overflow = '';

    // Limpiar animaciones
    const links = this.navMenu.querySelectorAll('.nav-link');
    links.forEach(link => {
      link.classList.remove('slide-in-left');
    });
  }

  setupIntersectionObserver() {
    // Efecto de scroll en la navegación
    const navContainer = document.querySelector('.nav-container');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navContainer.style.background = 'rgba(15, 15, 15, 0.95)';
        } else {
          navContainer.style.background = 'rgba(15, 15, 15, 0.98)';
        }
      });
    }, { threshold: 0.1 });

    observer.observe(document.querySelector('main') || document.body);
  }
}

// Inicializar navegación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new ModernNavigation();
});

// Exportar para uso global
window.ModernNavigation = ModernNavigation;
