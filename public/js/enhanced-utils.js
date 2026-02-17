/**
 * BuddyStore Enhanced UI Utilities
 * Common functions and utilities for the enhanced UI
 */

// ===== THEME MANAGEMENT =====
class ThemeManager {
  constructor() {
    this.init();
  }

  init() {
    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('buddystore-theme') || 'light';
    this.setTheme(savedTheme);
    
    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('buddystore-theme')) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('buddystore-theme', theme);
    
    // Update theme toggle button if it exists
    const toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
  }

  toggle() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    return newTheme;
  }

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }
}

// ===== NOTIFICATION SYSTEM =====
class NotificationManager {
  constructor() {
    this.container = this.createContainer();
    this.notifications = new Map();
  }

  createContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: var(--space-6);
      right: var(--space-6);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      max-width: 400px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
    return container;
  }

  show(message, type = 'info', duration = 4000) {
    const id = Date.now() + Math.random();
    const notification = this.createNotification(message, type, id);
    
    this.container.appendChild(notification);
    this.notifications.set(id, notification);
    
    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });
    
    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
    
    return id;
  }

  createNotification(message, type, id) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      padding: var(--space-4) var(--space-6);
      box-shadow: var(--shadow-xl);
      border-left: 4px solid var(--primary-blue);
      transform: translateX(100%);
      transition: transform var(--transition-normal);
      pointer-events: auto;
      cursor: pointer;
    `;
    
    // Set border color based on type
    const colors = {
      success: 'var(--accent-green)',
      error: 'var(--accent-red)',
      warning: 'var(--accent-orange)',
      info: 'var(--primary-blue)'
    };
    notification.style.borderLeftColor = colors[type] || colors.info;
    
    // Set icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: var(--space-3);">
        <span style="font-size: var(--font-size-lg);">${icons[type] || icons.info}</span>
        <div>
          <div style="font-weight: 600; color: var(--text-primary);">${message}</div>
        </div>
        <button onclick="notificationManager.remove(${id})" style="
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: var(--font-size-lg);
          padding: 0;
          margin-left: auto;
        ">&times;</button>
      </div>
    `;
    
    // Click to dismiss
    notification.addEventListener('click', () => this.remove(id));
    
    return notification;
  }

  remove(id) {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        this.notifications.delete(id);
      }, 300);
    }
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

// ===== LOADING MANAGER =====
class LoadingManager {
  constructor() {
    this.overlay = null;
    this.isLoading = false;
  }

  show(message = 'Loading...') {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.overlay = document.createElement('div');
    this.overlay.className = 'loading-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity var(--transition-normal);
    `;
    
    this.overlay.innerHTML = `
      <div style="
        background: var(--bg-primary);
        padding: var(--space-8);
        border-radius: var(--radius-xl);
        text-align: center;
        box-shadow: var(--shadow-xl);
        max-width: 300px;
        width: 90%;
      ">
        <div class="loading-spinner" style="margin: 0 auto var(--space-4);"></div>
        <div style="font-weight: 600; color: var(--text-primary);">${message}</div>
      </div>
    `;
    
    document.body.appendChild(this.overlay);
    
    // Trigger animation
    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
    });
  }

  hide() {
    if (!this.isLoading || !this.overlay) return;
    
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      this.overlay = null;
      this.isLoading = false;
    }, 300);
  }

  async wrap(promise, message) {
    this.show(message);
    try {
      const result = await promise;
      this.hide();
      return result;
    } catch (error) {
      this.hide();
      throw error;
    }
  }
}

// ===== MODAL MANAGER =====
class ModalManager {
  constructor() {
    this.modals = new Map();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeTopModal();
      }
    });
  }

  create(id, content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = `modal-${id}`;
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      visibility: hidden;
      transition: all var(--transition-normal);
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
      background: var(--bg-primary);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      max-width: ${options.maxWidth || '500px'};
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      transform: scale(0.9);
      transition: transform var(--transition-normal);
      position: relative;
    `;
    
    // Add close button if not disabled
    if (!options.hideCloseButton) {
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.style.cssText = `
        position: absolute;
        top: var(--space-4);
        right: var(--space-4);
        background: none;
        border: none;
        font-size: var(--font-size-2xl);
        color: var(--text-secondary);
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-full);
        transition: all var(--transition-fast);
      `;
      closeButton.addEventListener('click', () => this.close(id));
      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.background = 'var(--gray-100)';
      });
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.background = 'none';
      });
      modalContent.appendChild(closeButton);
    }
    
    modalContent.innerHTML += content;
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close on backdrop click
    if (!options.disableBackdropClose) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.close(id);
        }
      });
    }
    
    this.modals.set(id, { modal, options });
    return modal;
  }

  show(id) {
    const modalData = this.modals.get(id);
    if (modalData) {
      const { modal } = modalData;
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      
      requestAnimationFrame(() => {
        const content = modal.querySelector('.modal-content');
        if (content) {
          content.style.transform = 'scale(1)';
        }
      });
    }
  }

  close(id) {
    const modalData = this.modals.get(id);
    if (modalData) {
      const { modal } = modalData;
      const content = modal.querySelector('.modal-content');
      
      modal.style.opacity = '0';
      modal.style.visibility = 'hidden';
      if (content) {
        content.style.transform = 'scale(0.9)';
      }
      
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        this.modals.delete(id);
      }, 300);
    }
  }

  closeTopModal() {
    const modals = Array.from(this.modals.keys());
    if (modals.length > 0) {
      this.close(modals[modals.length - 1]);
    }
  }
}

// ===== ANIMATION UTILITIES =====
class AnimationUtils {
  static fadeIn(element, duration = 300) {
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease`;
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
    });
  }

  static slideIn(element, direction = 'up', duration = 300) {
    const transforms = {
      up: 'translateY(20px)',
      down: 'translateY(-20px)',
      left: 'translateX(20px)',
      right: 'translateX(-20px)'
    };
    
    element.style.transform = transforms[direction];
    element.style.opacity = '0';
    element.style.transition = `all ${duration}ms ease`;
    
    requestAnimationFrame(() => {
      element.style.transform = 'translateY(0)';
      element.style.opacity = '1';
    });
  }

  static staggeredAnimation(elements, animation = 'fadeIn', delay = 100) {
    elements.forEach((element, index) => {
      setTimeout(() => {
        this[animation](element);
      }, index * delay);
    });
  }

  static pulse(element, duration = 1000) {
    element.style.animation = `pulse ${duration}ms ease-in-out infinite`;
  }

  static shake(element, duration = 500) {
    element.style.animation = `shake ${duration}ms ease-in-out`;
    setTimeout(() => {
      element.style.animation = '';
    }, duration);
  }
}

// ===== FORM UTILITIES =====
class FormUtils {
  static validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static validatePhone(phone) {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return re.test(phone.replace(/\s/g, ''));
  }

  static formatCurrency(amount, currency = 'Rs') {
    return `${currency} ${parseFloat(amount).toLocaleString()}`;
  }

  static formatNumber(number) {
    return parseInt(number).toLocaleString();
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// ===== API UTILITIES =====
class ApiUtils {
  static async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  static async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  static async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

// ===== STORAGE UTILITIES =====
class StorageUtils {
  static set(key, value, expiry = null) {
    const item = {
      value,
      expiry: expiry ? Date.now() + expiry : null
    };
    localStorage.setItem(`buddystore_${key}`, JSON.stringify(item));
  }

  static get(key) {
    const itemStr = localStorage.getItem(`buddystore_${key}`);
    if (!itemStr) return null;

    try {
      const item = JSON.parse(itemStr);
      
      // Check if expired
      if (item.expiry && Date.now() > item.expiry) {
        localStorage.removeItem(`buddystore_${key}`);
        return null;
      }
      
      return item.value;
    } catch (error) {
      console.error('Error parsing stored item:', error);
      return null;
    }
  }

  static remove(key) {
    localStorage.removeItem(`buddystore_${key}`);
  }

  static clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('buddystore_')) {
        localStorage.removeItem(key);
      }
    });
  }
}

// ===== INITIALIZE GLOBAL INSTANCES =====
let themeManager, notificationManager, loadingManager, modalManager;

document.addEventListener('DOMContentLoaded', function() {
  // Initialize managers
  themeManager = new ThemeManager();
  notificationManager = new NotificationManager();
  loadingManager = new LoadingManager();
  modalManager = new ModalManager();
  
  // Make them globally available
  window.themeManager = themeManager;
  window.notificationManager = notificationManager;
  window.loadingManager = loadingManager;
  window.modalManager = modalManager;
  window.AnimationUtils = AnimationUtils;
  window.FormUtils = FormUtils;
  window.ApiUtils = ApiUtils;
  window.StorageUtils = StorageUtils;
  
  // Add global theme toggle function
  window.toggleTheme = () => themeManager.toggle();
  
  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    .notification.show {
      transform: translateX(0);
    }
  `;
  document.head.appendChild(style);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ThemeManager,
    NotificationManager,
    LoadingManager,
    ModalManager,
    AnimationUtils,
    FormUtils,
    ApiUtils,
    StorageUtils
  };
}