/* ===== MOBILE EXPERIENCE ENHANCEMENTS ===== */
/* Touch-friendly design and gesture support */

class MobileEnhancements {
  constructor() {
    this.isMobile = window.innerWidth <= 768;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isScrolling = false;
    this.init();
  }

  init() {
    if (this.isMobile) {
      this.enhanceTouchTargets();
      this.addGestureSupport();
      this.optimizeAnimations();
      this.addMobileNavigation();
      this.improveMobileLayout();
      this.addPullToRefresh();
    }
    
    this.addResponsiveHelpers();
    this.optimizePerformance();
  }

  enhanceTouchTargets() {
    // Ensure all interactive elements meet 44px minimum touch target
    const interactiveElements = document.querySelectorAll(`
      button, 
      .btn, 
      a, 
      input[type="submit"], 
      input[type="button"], 
      .clickable,
      .telegram-login,
      .header-btn,
      .logout-button,
      .add-user-btn
    `);

    interactiveElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      
      // Add touch target enhancement if too small
      if (rect.height < 44 || rect.width < 44) {
        element.style.minHeight = '44px';
        element.style.minWidth = '44px';
        element.style.display = 'inline-flex';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'center';
      }

      // Add touch feedback
      this.addTouchFeedback(element);
    });

    // Enhance form inputs for mobile
    this.enhanceMobileInputs();
  }

  addTouchFeedback(element) {
    let touchTimeout;

    element.addEventListener('touchstart', (e) => {
      element.style.transform = 'scale(0.95)';
      element.style.opacity = '0.8';
      
      // Clear any existing timeout
      clearTimeout(touchTimeout);
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      touchTimeout = setTimeout(() => {
        element.style.transform = '';
        element.style.opacity = '';
      }, 150);
    }, { passive: true });

    element.addEventListener('touchcancel', (e) => {
      element.style.transform = '';
      element.style.opacity = '';
      clearTimeout(touchTimeout);
    }, { passive: true });
  }

  enhanceMobileInputs() {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      // Increase padding for easier touch
      input.style.padding = '0.75rem 1rem';
      input.style.fontSize = '16px'; // Prevents zoom on iOS
      
      // Add appropriate input modes
      if (input.type === 'number') {
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('pattern', '[0-9]*');
      }
      
      if (input.type === 'email') {
        input.setAttribute('inputmode', 'email');
      }

      // Add focus enhancement
      input.addEventListener('focus', () => {
        input.style.borderWidth = '3px';
        input.style.borderColor = '#007aff';
        
        // Scroll into view with offset for mobile keyboard
        setTimeout(() => {
          input.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 300);
      });

      input.addEventListener('blur', () => {
        input.style.borderWidth = '2px';
        input.style.borderColor = 'rgba(0, 102, 255, 0.1)';
      });
    });
  }

  addGestureSupport() {
    // Swipe navigation
    document.addEventListener('touchstart', (e) => {
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.isScrolling = false;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!this.touchStartX || !this.touchStartY) return;

      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = this.touchStartX - touchX;
      const deltaY = this.touchStartY - touchY;

      // Determine if user is scrolling vertically
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        this.isScrolling = true;
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!this.touchStartX || !this.touchStartY || this.isScrolling) {
        this.touchStartX = 0;
        this.touchStartY = 0;
        return;
      }

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = this.touchStartX - touchEndX;
      const deltaY = this.touchStartY - touchEndY;

      // Minimum swipe distance
      const minSwipeDistance = 100;
      
      // Horizontal swipes
      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < 50) {
        if (deltaX > 0) {
          // Swipe left - next action
          this.handleSwipeLeft();
        } else {
          // Swipe right - back action
          this.handleSwipeRight();
        }
      }

      this.touchStartX = 0;
      this.touchStartY = 0;
    }, { passive: true });

    // Pinch to zoom prevention on specific elements
    this.preventPinchZoom();
  }

  handleSwipeLeft() {
    // Navigate to next logical page or action
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('dashboard')) {
      // Go to buy page
      const username = localStorage.getItem('username');
      const pic = localStorage.getItem('profilePic');
      window.location.href = `/buy.html?username=${username}`;
    } else if (currentPage.includes('buy')) {
      // Go to pricing
      window.location.href = '/pricing.html';
    }
  }

  handleSwipeRight() {
    // Navigate back
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('buy')) {
      // Go back to dashboard
      const username = localStorage.getItem('username');
      const pic = localStorage.getItem('profilePic');
      window.location.href = `/dashboard.html?name=${username}&pic=${encodeURIComponent(pic || '')}`;
    } else if (currentPage.includes('pricing')) {
      // Go back to buy
      window.location.href = '/buy.html';
    } else {
      // Generic back
      if (window.history.length > 1) {
        window.history.back();
      }
    }
  }

  preventPinchZoom() {
    // Prevent pinch zoom on form elements and buttons
    const preventZoomElements = document.querySelectorAll(`
      .container,
      .card,
      .login-box,
      form,
      .price-box
    `);

    preventZoomElements.forEach(element => {
      element.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      });
    });
  }

  optimizeAnimations() {
    // Reduce animations on mobile for better performance
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        /* Reduce animation complexity */
        .particle {
          display: none;
        }
        
        .particle-trail {
          display: none;
        }
        
        /* Simplify hover effects */
        .card:hover,
        .package-card:hover,
        .btn:hover {
          transform: translateY(-2px) scale(1.01) !important;
          transition: transform 0.2s ease !important;
        }
        
        /* Optimize backdrop filters */
        .navbar,
        .header,
        .container,
        .card {
          backdrop-filter: none;
          background: rgba(255, 255, 255, 0.95);
        }
        
        /* Reduce box shadows */
        .card,
        .container,
        .btn {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }
        
        /* Faster transitions */
        * {
          transition-duration: 0.2s !important;
        }
      }
      
      /* Touch-specific styles */
      @media (hover: none) and (pointer: coarse) {
        .btn:hover,
        .card:hover,
        .package-card:hover {
          transform: none !important;
        }
        
        .btn:active,
        .card:active {
          transform: scale(0.95) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  addMobileNavigation() {
    // Add mobile-specific navigation enhancements
    const navbar = document.querySelector('.navbar, .header');
    if (!navbar) return;

    // Add mobile menu toggle if not exists
    if (!navbar.querySelector('.mobile-menu-toggle')) {
      this.createMobileMenu(navbar);
    }

    // Add bottom navigation for mobile
    this.addBottomNavigation();
  }

  createMobileMenu(navbar) {
    const mobileToggle = document.createElement('button');
    mobileToggle.className = 'mobile-menu-toggle';
    mobileToggle.setAttribute('aria-label', 'Toggle mobile menu');
    mobileToggle.style.cssText = `
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      flex-direction: column;
      gap: 3px;
      
      @media (max-width: 768px) {
        display: flex;
      }
    `;

    // Hamburger icon
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('span');
      line.style.cssText = `
        width: 20px;
        height: 2px;
        background: #007aff;
        transition: all 0.3s ease;
        border-radius: 1px;
      `;
      mobileToggle.appendChild(line);
    }

    // Add to navbar
    const navLeft = navbar.querySelector('.navbar-left, .header-left');
    if (navLeft) {
      navLeft.appendChild(mobileToggle);
    }

    // Mobile menu functionality
    mobileToggle.addEventListener('click', () => {
      this.toggleMobileMenu();
    });
  }

  toggleMobileMenu() {
    // Create or toggle mobile menu overlay
    let mobileMenu = document.getElementById('mobileMenuOverlay');
    
    if (!mobileMenu) {
      mobileMenu = this.createMobileMenuOverlay();
    }

    if (mobileMenu.style.display === 'none' || !mobileMenu.style.display) {
      mobileMenu.style.display = 'flex';
      setTimeout(() => {
        mobileMenu.style.opacity = '1';
        mobileMenu.style.transform = 'translateX(0)';
      }, 10);
      document.body.style.overflow = 'hidden';
    } else {
      mobileMenu.style.opacity = '0';
      mobileMenu.style.transform = 'translateX(-100%)';
      setTimeout(() => {
        mobileMenu.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    }
  }

  createMobileMenuOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'mobileMenuOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const menu = document.createElement('div');
    menu.style.cssText = `
      width: 280px;
      height: 100%;
      background: white;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      overflow-y: auto;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
    `;

    const username = localStorage.getItem('username');
    const profilePic = localStorage.getItem('profilePic');

    menu.innerHTML = `
      <div style="padding: 2rem 1.5rem; border-bottom: 1px solid #eee;">
        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
          ${profilePic && profilePic !== 'null' ? 
            `<img src="${profilePic}" alt="Profile" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #007aff;">` :
            `<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #007aff, #0066ff); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">${username ? username[0].toUpperCase() : 'U'}</div>`
          }
          <div>
            <div style="font-weight: 600; color: #0f172a;">${username || 'User'}</div>
            <div style="font-size: 0.8rem; color: #64748b;">@${username || 'username'}</div>
          </div>
        </div>
        <button class="close-mobile-menu" style="
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #64748b;
          cursor: pointer;
        ">&times;</button>
      </div>
      
      <div style="padding: 1rem 0;">
        <a href="/dashboard.html?name=${username}&pic=${encodeURIComponent(profilePic || '')}" class="mobile-menu-item">
          <span class="menu-icon">🏠</span>
          <span>Dashboard</span>
        </a>
        <a href="/buy.html" class="mobile-menu-item">
          <span class="menu-icon">🛒</span>
          <span>Buy Packages</span>
        </a>
        <a href="/pricing.html" class="mobile-menu-item">
          <span class="menu-icon">💰</span>
          <span>Pricing</span>
        </a>
        <a href="/contact.html" class="mobile-menu-item">
          <span class="menu-icon">📞</span>
          <span>Contact</span>
        </a>
        
        <div style="border-top: 1px solid #eee; margin: 1rem 0; padding-top: 1rem;">
          <button onclick="logout()" class="mobile-menu-item" style="width: 100%; text-align: left; background: none; border: none; color: #ff3b30;">
            <span class="menu-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    `;

    // Add menu item styles
    const menuStyle = document.createElement('style');
    menuStyle.textContent = `
      .mobile-menu-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.5rem;
        text-decoration: none;
        color: #0f172a;
        transition: background 0.2s ease;
        border: none;
        cursor: pointer;
        font-size: 1rem;
      }
      
      .mobile-menu-item:hover {
        background: rgba(0, 122, 255, 0.1);
      }
      
      .mobile-menu-item .menu-icon {
        font-size: 1.2rem;
        width: 24px;
        text-align: center;
      }
    `;
    document.head.appendChild(menuStyle);

    // Close menu when clicking outside
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.toggleMobileMenu();
      }
    });

    // Close button
    menu.querySelector('.close-mobile-menu').addEventListener('click', () => {
      this.toggleMobileMenu();
    });

    overlay.appendChild(menu);
    document.body.appendChild(overlay);

    return overlay;
  }

  addBottomNavigation() {
    // Add bottom navigation for key actions on mobile
    if (window.location.pathname.includes('buy')) {
      this.addBuyPageBottomNav();
    }
  }

  addBuyPageBottomNav() {
    const bottomNav = document.createElement('div');
    bottomNav.className = 'mobile-bottom-nav';
    bottomNav.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      padding: 0.75rem 1rem;
      z-index: 1000;
      display: none;
      
      @media (max-width: 768px) {
        display: flex;
        gap: 0.75rem;
      }
    `;

    bottomNav.innerHTML = `
      <button onclick="addToCart()" class="bottom-nav-btn" style="
        flex: 1;
        background: linear-gradient(135deg, #f1c40f, #f39c12);
        color: white;
        border: none;
        padding: 0.75rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
      ">Add to Cart</button>
      
      <button onclick="makeOrder()" class="bottom-nav-btn" style="
        flex: 1;
        background: linear-gradient(135deg, #007aff, #0066ff);
        color: white;
        border: none;
        padding: 0.75rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
      ">Order Now</button>
    `;

    document.body.appendChild(bottomNav);

    // Add padding to body to account for bottom nav
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        body {
          padding-bottom: 80px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  improveMobileLayout() {
    // Add mobile-specific layout improvements
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        /* Container improvements */
        .container {
          margin: 1rem;
          padding: 1.5rem;
        }
        
        /* Form improvements */
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        .button-group {
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .button-group button {
          width: 100%;
          margin-top: 0;
        }
        
        /* Cart improvements */
        .cart-actions {
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .cart-actions button {
          width: 100%;
        }
        
        /* Stats grid improvements */
        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        
        /* Package grid improvements */
        .packages-grid,
        .category-packages {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        /* Typography improvements */
        h1, h2, h3 {
          font-size: 1.5rem;
        }
        
        .login-box h2 {
          font-size: 2rem;
        }
        
        /* Spacing improvements */
        .navbar,
        .header {
          padding: 1rem;
        }
        
        .content {
          padding: 1rem;
        }
        
        /* Modal improvements */
        .modal-content {
          margin: 1rem;
          max-width: none;
          width: auto;
        }
      }
      
      /* Landscape phone improvements */
      @media (max-width: 768px) and (orientation: landscape) {
        .login-box {
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .container {
          max-height: 80vh;
          overflow-y: auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  addPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let refreshThreshold = 100;

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!isPulling) return;

      currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;

      if (pullDistance > 0 && window.scrollY === 0) {
        e.preventDefault();
        
        // Visual feedback for pull to refresh
        if (pullDistance > refreshThreshold) {
          this.showPullToRefreshIndicator(true);
        } else {
          this.showPullToRefreshIndicator(false);
        }
      }
    });

    document.addEventListener('touchend', (e) => {
      if (!isPulling) return;

      const pullDistance = currentY - startY;
      
      if (pullDistance > refreshThreshold) {
        this.triggerRefresh();
      }
      
      this.hidePullToRefreshIndicator();
      isPulling = false;
      startY = 0;
      currentY = 0;
    }, { passive: true });
  }

  showPullToRefreshIndicator(ready = false) {
    let indicator = document.getElementById('pullToRefreshIndicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pullToRefreshIndicator';
      indicator.style.cssText = `
        position: fixed;
        top: -60px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 122, 255, 0.9);
        color: white;
        padding: 1rem;
        border-radius: 0 0 12px 12px;
        z-index: 10000;
        transition: top 0.3s ease;
        font-size: 0.9rem;
        font-weight: 600;
        text-align: center;
        min-width: 200px;
      `;
      document.body.appendChild(indicator);
    }

    indicator.textContent = ready ? '🔄 Release to refresh' : '⬇️ Pull to refresh';
    indicator.style.top = '0px';
    indicator.style.background = ready ? 
      'rgba(52, 199, 89, 0.9)' : 
      'rgba(0, 122, 255, 0.9)';
  }

  hidePullToRefreshIndicator() {
    const indicator = document.getElementById('pullToRefreshIndicator');
    if (indicator) {
      indicator.style.top = '-60px';
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }
  }

  triggerRefresh() {
    // Show loading state
    this.showPullToRefreshIndicator();
    const indicator = document.getElementById('pullToRefreshIndicator');
    if (indicator) {
      indicator.textContent = '🔄 Refreshing...';
      indicator.style.background = 'rgba(0, 122, 255, 0.9)';
    }

    // Refresh page data
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  addResponsiveHelpers() {
    // Add responsive utility classes
    const style = document.createElement('style');
    style.textContent = `
      /* Responsive utilities */
      .mobile-only {
        display: none;
      }
      
      .desktop-only {
        display: block;
      }
      
      @media (max-width: 768px) {
        .mobile-only {
          display: block;
        }
        
        .desktop-only {
          display: none;
        }
        
        .mobile-hidden {
          display: none !important;
        }
        
        .mobile-full-width {
          width: 100% !important;
        }
        
        .mobile-text-center {
          text-align: center !important;
        }
        
        .mobile-no-margin {
          margin: 0 !important;
        }
        
        .mobile-small-text {
          font-size: 0.8rem !important;
        }
      }
      
      /* Touch device specific */
      @media (hover: none) and (pointer: coarse) {
        .hover-only {
          display: none;
        }
        
        .touch-friendly {
          padding: 0.75rem !important;
          min-height: 44px !important;
          min-width: 44px !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  optimizePerformance() {
    // Optimize performance for mobile devices
    
    // Debounce resize events
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.isMobile = window.innerWidth <= 768;
        this.handleOrientationChange();
      }, 250);
    });

    // Handle orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 500);
    });

    // Optimize scroll performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      if (!scrollTimeout) {
        scrollTimeout = setTimeout(() => {
          this.handleScroll();
          scrollTimeout = null;
        }, 16); // ~60fps
      }
    }, { passive: true });
  }

  handleOrientationChange() {
    // Adjust layout for orientation changes
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }

    // Force layout recalculation
    document.body.style.height = window.innerHeight + 'px';
    setTimeout(() => {
      document.body.style.height = '';
    }, 500);
  }

  handleScroll() {
    // Hide/show mobile bottom navigation based on scroll direction
    const bottomNav = document.querySelector('.mobile-bottom-nav');
    if (!bottomNav) return;

    if (!this.lastScrollY) this.lastScrollY = window.scrollY;

    if (window.scrollY > this.lastScrollY && window.scrollY > 100) {
      // Scrolling down - hide bottom nav
      bottomNav.style.transform = 'translateY(100%)';
    } else {
      // Scrolling up - show bottom nav
      bottomNav.style.transform = 'translateY(0)';
    }

    this.lastScrollY = window.scrollY;
  }
}

// Auto-initialize mobile enhancements
document.addEventListener('DOMContentLoaded', () => {
  new MobileEnhancements();
});

// Re-initialize on window resize
window.addEventListener('resize', () => {
  if (window.innerWidth <= 768 && !window.mobileEnhancementsInstance) {
    window.mobileEnhancementsInstance = new MobileEnhancements();
  }
});

// Export for manual control
window.MobileEnhancements = MobileEnhancements;