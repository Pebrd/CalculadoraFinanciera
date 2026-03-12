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
  }

  createNavigation() {
    const navContainer = document.createElement('div');
    navContainer.className = 'nav-container';

    const nav = document.createElement('nav');

    // Brand/Logo
    const brandGroup = document.createElement('div');
    brandGroup.className = 'nav-header-group';
    brandGroup.innerHTML = '<a href="index.html" class="nav-brand">Pampa Finance</a>';

    // Toggle Hamburguesa
    const navToggle = document.createElement('button');
    navToggle.className = 'nav-toggle';
    navToggle.innerHTML = '<span></span><span></span><span></span>';

    // Menú de navegación
    const navMenu = document.createElement('ul');
    navMenu.className = 'nav-menu mobile-hidden';

    const menuItems = [
      { href: 'index.html', text: '📊 Cotizaciones' },
      { href: 'calculadoras.html', text: '🧮 Calculadoras' },
      { href: 'tasas.html', text: '📈 Tasas' },
      { href: 'noticias.html', text: '📰 Noticias' },
      { href: 'Graficos historicos.html', text: '📉 Gráficos' },
      { href: 'Hacienda.html', text: '🌾 Agro' },
      { href: 'ScreenerArgy.html', text: '🇦🇷 Argy' }
    ];

    menuItems.forEach(item => {
      const li = document.createElement('li');
      li.className = 'nav-item';
      const a = document.createElement('a');
      a.href = item.href;
      a.className = 'nav-link';
      if (window.location.pathname.includes(item.href) || (window.location.pathname.endsWith('/') && item.href === 'index.html')) {
          a.classList.add('active');
      }
      a.textContent = item.text;
      li.appendChild(a);
      navMenu.appendChild(li);
    });

    nav.appendChild(brandGroup);
    nav.appendChild(navMenu);
    nav.appendChild(navToggle);
    navContainer.appendChild(nav);
    document.body.appendChild(navContainer);

    this.navToggle = navToggle;
    this.navMenu = navMenu;
    this.navContainer = navContainer;
  }

  bindEvents() {
    this.navToggle.addEventListener('click', () => {
        this.isOpen ? this.closeMenu() : this.openMenu();
    });

    document.addEventListener('click', (e) => {
        if (this.isOpen && !this.navContainer.contains(e.target)) this.closeMenu();
    });
  }

  openMenu() {
    this.isOpen = true;
    this.navToggle.classList.add('active');
    this.navMenu.classList.remove('mobile-hidden');
    this.navMenu.classList.add('mobile-visible');
    document.body.style.overflow = 'hidden';
  }

  closeMenu() {
    this.isOpen = false;
    this.navToggle.classList.remove('active');
    this.navMenu.classList.add('mobile-hidden');
    this.navMenu.classList.remove('mobile-visible');
    document.body.style.overflow = '';
  }
}

document.addEventListener('DOMContentLoaded', () => new ModernNavigation());
