/* ========================================================== */
/* === SCRIPTS COMPARTIDOS - CALCULADORA FINANCIERA === */
/* ========================================================== */

// === CACHE Y OPTIMIZACIÓN DE RENDIMIENTO ===
const Cache = {
  data: new Map(),
  timestamps: new Map(),
  TTL: 5 * 60 * 1000, // 5 minutos

  set(key, value) {
    this.data.set(key, value);
    this.timestamps.set(key, Date.now());
  },

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.TTL) {
      this.data.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.data.get(key);
  },

  clear() {
    this.data.clear();
    this.timestamps.clear();
  }
};

// === DEBOUNCING PARA OPTIMIZAR LLAMADAS ===
const Debouncer = {
  timeouts: new Map(),

  debounce(key, func, delay = 300) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }
    
    const timeout = setTimeout(() => {
      func();
      this.timeouts.delete(key);
    }, delay);
    
    this.timeouts.set(key, timeout);
  },

  cancel(key) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
  }
};

// === UTILIDADES DE FORMATEO ===
const Formatters = {
  currency(value, currency = 'ARS') {
    if (value === null || value === undefined || isNaN(parseFloat(value))) {
      return '-';
    }
    
    const options = {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    };
    
    return parseFloat(value).toLocaleString(currency === 'ARS' ? 'es-AR' : 'en-US', options);
  },

  percentage(value) {
    if (value === null || value === undefined || isNaN(parseFloat(value))) {
      return '-';
    }
    
    return parseFloat(value).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + '%';
  },

  number(value) {
    if (value === null || value === undefined || isNaN(parseFloat(value))) {
      return '-';
    }
    
    return parseFloat(value).toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  },

  time(date = new Date()) {
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
};

// === GESTIÓN DE ESTADO DE APIS ===
const ApiStatus = {
  apis: new Map(),
  
  register(name, url, elementId) {
    this.apis.set(name, { url, elementId, status: 'unknown' });
  },

  async checkAll() {
    const promises = Array.from(this.apis.entries()).map(([name, config]) => 
      this.checkSingle(name, config.url, config.elementId)
    );
    
    await Promise.allSettled(promises);
  },

  async checkSingle(name, url, elementId) {
    const statusElement = document.getElementById(elementId);
    if (!statusElement) return;

    const light = statusElement.querySelector('.status-light');
    const text = statusElement.querySelector('.status-text');

    if (!light || !text) return;

    light.className = 'status-light';
    text.textContent = 'Cargando...';
    text.style.color = '#ddd';

    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache'
      });
      
      const isUp = response.ok;
      
      if (isUp) {
        light.className = 'status-light funcional';
        text.textContent = 'Funcional';
        text.style.color = '#4f4';
        this.apis.get(name).status = 'up';
      } else {
        light.className = 'status-light error';
        text.textContent = 'Error';
        text.style.color = 'var(--error)';
        this.apis.get(name).status = 'down';
      }
    } catch (error) {
      light.className = 'status-light error';
      text.textContent = 'Error';
      text.style.color = 'var(--error)';
      this.apis.get(name).status = 'error';
      console.error(`Error verificando API ${name}:`, error);
    }
  },

  getStatus(name) {
    return this.apis.get(name)?.status || 'unknown';
  }
};

// === GESTIÓN DE NOTIFICACIONES ===
const Notifications = {
  show(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} fade-in`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '10px 15px',
      borderRadius: '4px',
      color: '#fff',
      fontWeight: 'bold',
      zIndex: '10000',
      maxWidth: '300px',
      wordWrap: 'break-word'
    });

    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#4f4';
        break;
      case 'error':
        notification.style.backgroundColor = 'var(--error)';
        break;
      case 'warning':
        notification.style.backgroundColor = '#ffa500';
        break;
      default:
        notification.style.backgroundColor = '#333';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }
};

// === LAZY LOADING PARA WIDGETS ===
const LazyLoader = {
  observer: null,
  
  init() {
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            const loadFunction = element.dataset.loadFunction;
            
            if (loadFunction && typeof window[loadFunction] === 'function') {
              window[loadFunction]();
              this.observer.unobserve(element);
            }
          }
        });
      }, {
        rootMargin: '50px'
      });
    }
  },

  observe(element, loadFunction) {
    if (this.observer) {
      element.dataset.loadFunction = loadFunction;
      this.observer.observe(element);
    } else {
      // Fallback para navegadores sin IntersectionObserver
      if (typeof window[loadFunction] === 'function') {
        window[loadFunction]();
      }
    }
  }
};

// === GESTIÓN DE ERRORES GLOBAL ===
const ErrorHandler = {
  init() {
    window.addEventListener('error', (event) => {
      console.error('Error global:', event.error);
      Notifications.show('Ha ocurrido un error inesperado', 'error');
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Promise rechazada:', event.reason);
      Notifications.show('Error en operación asíncrona', 'error');
    });
  }
};

// === UTILIDADES DE DOM ===
const DOM = {
  ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  },

  createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    
    if (content) {
      element.textContent = content;
    }
    
    return element;
  },

  addClass(element, className) {
    if (element && element.classList) {
      element.classList.add(className);
    }
  },

  removeClass(element, className) {
    if (element && element.classList) {
      element.classList.remove(className);
    }
  },

  toggleClass(element, className) {
    if (element && element.classList) {
      element.classList.toggle(className);
    }
  }
};

// === INICIALIZACIÓN AUTOMÁTICA ===
DOM.ready(() => {
  LazyLoader.init();
  ErrorHandler.init();
  
  // Inicializar APIs comunes
  ApiStatus.register('dolarapi', 'https://dolarapi.com/v1/estado', 'dolarapi-status');
  ApiStatus.register('argentinadatos', 'https://api.argentinadatos.com/v1/estado', 'argentinadatos-status');
  ApiStatus.register('criptoya', 'https://criptoya.com/api/dolar', 'criptoya-status');
  ApiStatus.register('comparadolar', 'https://api2.comparadolar.ar/quotes', 'comparadolar-status');
  
  // Verificar estado de APIs cada hora
  ApiStatus.checkAll();
  setInterval(() => ApiStatus.checkAll(), 3600000);
});

// === EXPORTAR PARA USO GLOBAL ===
window.CalculadoraFinanciera = {
  Cache,
  Debouncer,
  Formatters,
  ApiStatus,
  Notifications,
  LazyLoader,
  ErrorHandler,
  DOM
};
