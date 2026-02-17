/* ===== ACCESSIBILITY & INCLUSIVITY ENHANCEMENTS ===== */
/* WCAG 2.1 compliance without changing existing design */

class AccessibilityEnhancements {
  constructor() {
    this.focusableElements = [];
    this.currentFocusIndex = -1;
    this.announcements = [];
    this.init();
  }

  init() {
    this.addAriaLabels();
    this.enhanceKeyboardNavigation();
    this.addScreenReaderSupport();
    this.improveColorContrast();
    this.addFocusManagement();
    this.addSkipLinks();
    this.enhanceFormAccessibility();
    this.addLiveRegions();
    this.addKeyboardShortcuts();
    this.addReducedMotionSupport();
  }

  addAriaLabels() {
    // Add ARIA labels to existing elements without changing structure
    
    // Navigation elements
    const navbar = document.querySelector('.navbar, .header');
    if (navbar) {
      navbar.setAttribute('role', 'navigation');
      navbar.setAttribute('aria-label', 'Main navigation');
    }

    // Buttons and interactive elements
    const buttons = document.querySelectorAll('button, .btn');
    buttons.forEach((button, index) => {
      if (!button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby')) {
        const text = button.textContent.trim() || button.innerHTML.replace(/<[^>]*>/g, '').trim();
        if (text) {
          button.setAttribute('aria-label', text);
        } else {
          // Generic labels for buttons without text
          if (button.classList.contains('logout-button')) {
            button.setAttribute('aria-label', 'Logout from account');
          } else if (button.classList.contains('add-to-cart')) {
            button.setAttribute('aria-label', 'Add selected package to shopping cart');
          } else if (button.onclick && button.onclick.toString().includes('makeOrder')) {
            button.setAttribute('aria-label', 'Place order for selected package');
          } else {
            button.setAttribute('aria-label', `Action button ${index + 1}`);
          }
        }
      }
    });

    // Links
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      if (!link.getAttribute('aria-label') && !link.getAttribute('aria-labelledby')) {
        const text = link.textContent.trim();
        const href = link.getAttribute('href');
        
        if (text) {
          if (href && href.startsWith('http') && !href.includes(window.location.hostname)) {
            link.setAttribute('aria-label', `${text} (opens in new tab)`);
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
          }
        } else if (href) {
          link.setAttribute('aria-label', `Navigate to ${href}`);
        }
      }
    });

    // Form elements
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`) || 
                   input.closest('.form-group')?.querySelector('label') ||
                   input.previousElementSibling?.tagName === 'LABEL' ? input.previousElementSibling : null;
      
      if (label && !input.getAttribute('aria-labelledby')) {
        if (!label.id) {
          label.id = `label-${input.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        input.setAttribute('aria-labelledby', label.id);
      }

      // Add required indicators
      if (input.hasAttribute('required') && !input.getAttribute('aria-required')) {
        input.setAttribute('aria-required', 'true');
      }

      // Add input descriptions
      if (input.type === 'number') {
        const min = input.getAttribute('min');
        const max = input.getAttribute('max');
        if (min && max) {
          input.setAttribute('aria-description', `Enter a number between ${min} and ${max}`);
        }
      }
    });

    // Package cards and content sections
    const packageCards = document.querySelectorAll('.package-card, .card');
    packageCards.forEach((card, index) => {
      if (!card.getAttribute('role')) {
        card.setAttribute('role', 'article');
      }
      
      const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading && !card.getAttribute('aria-labelledby')) {
        if (!heading.id) {
          heading.id = `card-heading-${index}`;
        }
        card.setAttribute('aria-labelledby', heading.id);
      }
    });

    // Stats and metrics
    const statCards = document.querySelectorAll('.stat-card, .analytics-card');
    statCards.forEach((stat, index) => {
      const number = stat.querySelector('.stat-number, .analytics-value');
      const label = stat.querySelector('.stat-label, .analytics-subtitle');
      
      if (number && label) {
        stat.setAttribute('role', 'img');
        stat.setAttribute('aria-label', `${label.textContent}: ${number.textContent}`);
      }
    });

    // Shopping cart
    const cartItems = document.querySelectorAll('.cart-item');
    cartItems.forEach((item, index) => {
      item.setAttribute('role', 'listitem');
      const title = item.querySelector('.cart-item-title');
      const price = item.querySelector('.cart-item-price');
      if (title && price) {
        item.setAttribute('aria-label', `Cart item: ${title.textContent}, ${price.textContent}`);
      }
    });
  }

  enhanceKeyboardNavigation() {
    // Add keyboard navigation without changing existing functionality
    
    // Tab order management
    this.manageFocusableElements();
    
    // Arrow key navigation for card grids
    this.addArrowKeyNavigation();
    
    // Enter/Space key activation for clickable elements
    this.addKeyActivation();
    
    // Escape key handling
    this.addEscapeKeyHandling();
  }

  manageFocusableElements() {
    // Get all focusable elements in logical order
    this.focusableElements = Array.from(document.querySelectorAll(`
      a[href],
      button:not([disabled]),
      input:not([disabled]),
      select:not([disabled]),
      textarea:not([disabled]),
      [tabindex]:not([tabindex="-1"]),
      .package-card,
      .card[onclick],
      .clickable
    `)).filter(el => {
      return el.offsetWidth > 0 && el.offsetHeight > 0 && !el.hidden;
    });

    // Ensure proper tab order
    this.focusableElements.forEach((element, index) => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    });
  }

  addArrowKeyNavigation() {
    // Arrow key navigation for grid layouts
    const grids = document.querySelectorAll('.packages-grid, .stats-grid, .category-packages');
    
    grids.forEach(grid => {
      const items = Array.from(grid.children);
      
      items.forEach((item, index) => {
        item.addEventListener('keydown', (e) => {
          let targetIndex = -1;
          const columns = this.getGridColumns(grid);
          
          switch (e.key) {
            case 'ArrowRight':
              targetIndex = index + 1;
              break;
            case 'ArrowLeft':
              targetIndex = index - 1;
              break;
            case 'ArrowDown':
              targetIndex = index + columns;
              break;
            case 'ArrowUp':
              targetIndex = index - columns;
              break;
            case 'Home':
              targetIndex = 0;
              break;
            case 'End':
              targetIndex = items.length - 1;
              break;
          }
          
          if (targetIndex >= 0 && targetIndex < items.length) {
            e.preventDefault();
            items[targetIndex].focus();
          }
        });
      });
    });
  }

  getGridColumns(grid) {
    const style = window.getComputedStyle(grid);
    const columns = style.gridTemplateColumns;
    if (columns && columns !== 'none') {
      return columns.split(' ').length;
    }
    
    // Fallback: estimate based on item widths
    const items = grid.children;
    if (items.length < 2) return 1;
    
    const firstItemRect = items[0].getBoundingClientRect();
    const secondItemRect = items[1].getBoundingClientRect();
    
    return firstItemRect.top === secondItemRect.top ? 2 : 1;
  }

  addKeyActivation() {
    // Add Enter/Space activation for clickable elements
    const clickableElements = document.querySelectorAll(`
      .package-card[onclick],
      .card[onclick],
      .clickable,
      [role="button"]:not(button)
    `);
    
    clickableElements.forEach(element => {
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          
          // Trigger click event
          if (element.onclick) {
            element.onclick(e);
          } else {
            element.click();
          }
          
          // Visual feedback
          element.style.transform = 'scale(0.95)';
          setTimeout(() => {
            element.style.transform = '';
          }, 150);
        }
      });
    });
  }

  addEscapeKeyHandling() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close modals
        const modals = document.querySelectorAll('[style*="position: fixed"], .modal, .overlay');
        modals.forEach(modal => {
          if (modal.style.display !== 'none' && modal.style.visibility !== 'hidden') {
            // Try to find close button
            const closeBtn = modal.querySelector('.close, .close-btn, [aria-label*="close"]');
            if (closeBtn) {
              closeBtn.click();
            } else {
              modal.style.display = 'none';
            }
          }
        });
        
        // Clear focus if on non-interactive element
        if (document.activeElement && !this.focusableElements.includes(document.activeElement)) {
          document.activeElement.blur();
        }
      }
    });
  }

  addScreenReaderSupport() {
    // Add screen reader announcements for dynamic content
    
    // Announce page changes
    this.announcePageLoad();
    
    // Announce form validation
    this.addFormValidationAnnouncements();
    
    // Announce cart updates
    this.addCartAnnouncements();
    
    // Announce loading states
    this.addLoadingAnnouncements();
  }

  announcePageLoad() {
    const pageTitle = document.title;
    const mainHeading = document.querySelector('h1, h2, .navbar-left, .header-left');
    const announcement = mainHeading ? 
      `${pageTitle}. ${mainHeading.textContent}` : 
      pageTitle;
    
    this.announce(announcement);
  }

  addFormValidationAnnouncements() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        const invalidInputs = form.querySelectorAll(':invalid');
        if (invalidInputs.length > 0) {
          this.announce(`Form has ${invalidInputs.length} error${invalidInputs.length > 1 ? 's' : ''}. Please check your input.`);
        }
      });
    });

    // Individual input validation
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('invalid', (e) => {
        const label = this.getInputLabel(input);
        this.announce(`${label}: ${input.validationMessage}`);
      });
      
      input.addEventListener('input', (e) => {
        if (input.validity.valid && input.hasAttribute('aria-invalid')) {
          input.removeAttribute('aria-invalid');
          input.removeAttribute('aria-describedby');
        }
      });
    });
  }

  getInputLabel(input) {
    const labelId = input.getAttribute('aria-labelledby');
    if (labelId) {
      const label = document.getElementById(labelId);
      return label ? label.textContent : 'Input field';
    }
    
    const label = document.querySelector(`label[for="${input.id}"]`);
    return label ? label.textContent : 'Input field';
  }

  addCartAnnouncements() {
    // Override cart functions to add announcements
    const originalAddToCart = window.addToCart;
    if (originalAddToCart) {
      window.addToCart = (...args) => {
        const result = originalAddToCart.apply(this, args);
        const pkg = document.getElementById('package')?.value;
        const count = document.getElementById('videos')?.value;
        this.announce(`Added ${pkg} package with ${count} videos to cart`);
        return result;
      };
    }

    const originalRemoveFromCart = window.removeFromCart;
    if (originalRemoveFromCart) {
      window.removeFromCart = (index) => {
        const item = window.shoppingCart?.[index];
        const result = originalRemoveFromCart(index);
        if (item) {
          this.announce(`Removed ${item.package} package from cart`);
        }
        return result;
      };
    }
  }

  addLoadingAnnouncements() {
    // Announce loading states
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      this.announce('Loading content');
      return originalFetch.apply(this, args)
        .then(response => {
          this.announce('Content loaded');
          return response;
        })
        .catch(error => {
          this.announce('Error loading content');
          throw error;
        });
    };
  }

  improveColorContrast() {
    // Add high contrast mode support
    const style = document.createElement('style');
    style.id = 'accessibility-contrast';
    style.textContent = `
      /* High contrast mode support */
      @media (prefers-contrast: high) {
        .btn, button {
          border: 2px solid currentColor !important;
        }
        
        .card, .package-card, .container {
          border: 1px solid #333 !important;
        }
        
        a {
          text-decoration: underline !important;
        }
        
        .navbar, .header {
          border-bottom: 2px solid #333 !important;
        }
      }
      
      /* Focus indicators */
      *:focus {
        outline: 3px solid #007aff !important;
        outline-offset: 2px !important;
      }
      
      /* Skip to content link */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #007aff;
        color: white;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 10000;
        transition: top 0.3s ease;
      }
      
      .skip-link:focus {
        top: 6px;
      }
      
      /* Screen reader only content */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
        
        .particle,
        .particle-trail {
          display: none !important;
        }
      }
      
      /* Error states */
      .error, [aria-invalid="true"] {
        border-color: #dc3545 !important;
        box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25) !important;
      }
      
      /* Success states */
      .success, [aria-invalid="false"] {
        border-color: #28a745 !important;
      }
    `;
    document.head.appendChild(style);
  }

  addFocusManagement() {
    // Focus management for dynamic content
    
    // Focus trap for modals
    this.addFocusTrap();
    
    // Focus restoration
    this.addFocusRestoration();
    
    // Focus indicators
    this.enhanceFocusIndicators();
  }

  addFocusTrap() {
    const modals = document.querySelectorAll('.modal, [role="dialog"]');
    
    modals.forEach(modal => {
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          const focusableElements = modal.querySelectorAll(`
            a[href], button:not([disabled]), input:not([disabled]),
            select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])
          `);
          
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      });
    });
  }

  addFocusRestoration() {
    let lastFocusedElement = null;
    
    // Store focus before opening modals
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-toggle="modal"], .modal-trigger')) {
        lastFocusedElement = e.target;
      }
    });
    
    // Restore focus when modals close
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.classList.contains('modal') || target.style.position === 'fixed') {
            if (target.style.display === 'none' && lastFocusedElement) {
              lastFocusedElement.focus();
              lastFocusedElement = null;
            }
          }
        }
      });
    });
    
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['style', 'class']
    });
  }

  enhanceFocusIndicators() {
    // Add visible focus indicators for all interactive elements
    const style = document.createElement('style');
    style.textContent = `
      /* Enhanced focus indicators */
      button:focus,
      .btn:focus,
      a:focus,
      input:focus,
      select:focus,
      textarea:focus,
      .package-card:focus,
      .card:focus,
      [tabindex]:focus {
        outline: 3px solid #007aff !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 1px #007aff !important;
      }
      
      /* Focus within containers */
      .container:focus-within,
      .card:focus-within {
        box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.3) !important;
      }
    `;
    document.head.appendChild(style);
  }

  addSkipLinks() {
    // Add skip to content links
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Add main content landmark if not exists
    let mainContent = document.querySelector('main, [role="main"], #main-content');
    if (!mainContent) {
      const content = document.querySelector('.content, .container, .main');
      if (content) {
        content.id = 'main-content';
        content.setAttribute('role', 'main');
      }
    }
  }

  enhanceFormAccessibility() {
    // Add form accessibility enhancements
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      // Add form role and label
      if (!form.getAttribute('role')) {
        form.setAttribute('role', 'form');
      }
      
      // Group related fields
      this.addFieldsets(form);
      
      // Add error containers
      this.addErrorContainers(form);
      
      // Add required field indicators
      this.addRequiredIndicators(form);
    });
  }

  addFieldsets(form) {
    // Group related form fields in fieldsets
    const groups = form.querySelectorAll('.form-group, .input-group');
    
    if (groups.length > 1) {
      const fieldset = document.createElement('fieldset');
      fieldset.style.border = 'none';
      fieldset.style.padding = '0';
      fieldset.style.margin = '0';
      
      const legend = document.createElement('legend');
      legend.className = 'sr-only';
      legend.textContent = form.querySelector('h1, h2, h3')?.textContent || 'Form fields';
      
      fieldset.appendChild(legend);
      
      // Move form content into fieldset
      while (form.firstChild) {
        fieldset.appendChild(form.firstChild);
      }
      
      form.appendChild(fieldset);
    }
  }

  addErrorContainers(form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (!input.getAttribute('aria-describedby')) {
        const errorId = `error-${input.id || Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const errorContainer = document.createElement('div');
        errorContainer.id = errorId;
        errorContainer.className = 'error-message sr-only';
        errorContainer.setAttribute('role', 'alert');
        errorContainer.setAttribute('aria-live', 'polite');
        
        input.parentNode.appendChild(errorContainer);
        input.setAttribute('aria-describedby', errorId);
      }
    });
  }

  addRequiredIndicators(form) {
    const requiredInputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    requiredInputs.forEach(input => {
      const label = document.querySelector(`label[for="${input.id}"]`) ||
                   input.closest('.form-group')?.querySelector('label');
      
      if (label && !label.querySelector('.required-indicator')) {
        const indicator = document.createElement('span');
        indicator.className = 'required-indicator';
        indicator.textContent = ' *';
        indicator.style.color = '#dc3545';
        indicator.setAttribute('aria-label', 'required');
        label.appendChild(indicator);
      }
    });
  }

  addLiveRegions() {
    // Add ARIA live regions for dynamic announcements
    const liveRegion = document.createElement('div');
    liveRegion.id = 'aria-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    
    document.body.appendChild(liveRegion);
    
    // Add assertive live region for urgent announcements
    const assertiveRegion = document.createElement('div');
    assertiveRegion.id = 'aria-live-assertive';
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';
    
    document.body.appendChild(assertiveRegion);
  }

  addKeyboardShortcuts() {
    // Add keyboard shortcuts with announcements
    const shortcuts = {
      'Alt+1': () => this.focusMainContent(),
      'Alt+2': () => this.focusNavigation(),
      'Alt+3': () => this.focusSearch(),
      'Alt+H': () => this.goHome(),
      'Alt+B': () => this.goBuy(),
      'Alt+?': () => this.showKeyboardHelp()
    };
    
    document.addEventListener('keydown', (e) => {
      const key = `${e.altKey ? 'Alt+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
      
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    });
    
    // Add keyboard help
    this.addKeyboardHelp();
  }

  focusMainContent() {
    const main = document.querySelector('main, [role="main"], #main-content, .content');
    if (main) {
      main.focus();
      this.announce('Focused main content');
    }
  }

  focusNavigation() {
    const nav = document.querySelector('nav, [role="navigation"], .navbar');
    if (nav) {
      const firstLink = nav.querySelector('a, button');
      if (firstLink) {
        firstLink.focus();
        this.announce('Focused navigation');
      }
    }
  }

  focusSearch() {
    const search = document.querySelector('input[type="search"], input[placeholder*="search" i]');
    if (search) {
      search.focus();
      this.announce('Focused search');
    }
  }

  goHome() {
    const username = localStorage.getItem('username');
    const pic = localStorage.getItem('profilePic');
    if (username) {
      window.location.href = `/dashboard.html?name=${username}&pic=${encodeURIComponent(pic || '')}`;
    } else {
      window.location.href = '/';
    }
  }

  goBuy() {
    window.location.href = '/buy.html';
  }

  addKeyboardHelp() {
    const helpButton = document.createElement('button');
    helpButton.textContent = '?';
    helpButton.setAttribute('aria-label', 'Show keyboard shortcuts');
    helpButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #007aff;
      color: white;
      border: none;
      font-size: 1.2rem;
      font-weight: bold;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
    `;
    
    helpButton.addEventListener('click', () => this.showKeyboardHelp());
    document.body.appendChild(helpButton);
  }

  showKeyboardHelp() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        border-radius: 16px;
        padding: 2rem;
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
      " role="dialog" aria-labelledby="keyboard-help-title" aria-modal="true">
        <h2 id="keyboard-help-title" style="margin-top: 0; color: #007aff;">Keyboard Shortcuts</h2>
        
        <div style="display: grid; gap: 1rem; margin-bottom: 2rem;">
          <div><kbd>Alt + 1</kbd> - Focus main content</div>
          <div><kbd>Alt + 2</kbd> - Focus navigation</div>
          <div><kbd>Alt + H</kbd> - Go to home/dashboard</div>
          <div><kbd>Alt + B</kbd> - Go to buy page</div>
          <div><kbd>Tab</kbd> - Navigate forward</div>
          <div><kbd>Shift + Tab</kbd> - Navigate backward</div>
          <div><kbd>Enter/Space</kbd> - Activate buttons and links</div>
          <div><kbd>Arrow keys</kbd> - Navigate grid items</div>
          <div><kbd>Escape</kbd> - Close modals and dialogs</div>
          <div><kbd>Alt + ?</kbd> - Show this help</div>
        </div>
        
        <button onclick="this.closest('[role=dialog]').parentNode.remove()" style="
          background: #007aff;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        ">Close</button>
      </div>
    `;
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
    
    // Focus the modal
    const dialog = modal.querySelector('[role="dialog"]');
    dialog.focus();
  }

  addReducedMotionSupport() {
    // Detect and respect reduced motion preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (prefersReducedMotion.matches) {
      this.disableAnimations();
    }
    
    prefersReducedMotion.addEventListener('change', (e) => {
      if (e.matches) {
        this.disableAnimations();
      } else {
        this.enableAnimations();
      }
    });
  }

  disableAnimations() {
    const style = document.createElement('style');
    style.id = 'reduced-motion';
    style.textContent = `
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      
      .particle,
      .particle-trail {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    
    this.announce('Animations disabled for reduced motion');
  }

  enableAnimations() {
    const style = document.getElementById('reduced-motion');
    if (style) {
      style.remove();
    }
  }

  announce(message, priority = 'polite') {
    const region = priority === 'assertive' ? 
      document.getElementById('aria-live-assertive') : 
      document.getElementById('aria-live-region');
    
    if (region) {
      // Clear previous message
      region.textContent = '';
      
      // Add new message after a brief delay
      setTimeout(() => {
        region.textContent = message;
      }, 100);
      
      // Clear message after announcement
      setTimeout(() => {
        region.textContent = '';
      }, 5000);
    }
    
    // Also log for debugging
    console.log(`Screen Reader: ${message}`);
  }
}

// Auto-initialize accessibility enhancements
document.addEventListener('DOMContentLoaded', () => {
  new AccessibilityEnhancements();
});

// Export for manual control
window.AccessibilityEnhancements = AccessibilityEnhancements;