/* ===== UNIFIED NAVIGATION SYSTEM ===== */
/* Enhances existing navigation without changing styles */

class UnifiedNavigation {
  constructor() {
    this.currentPage = this.getCurrentPage();
    this.username = localStorage.getItem('username');
    this.profilePic = localStorage.getItem('profilePic');
    this.init();
  }

  getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('dashboard')) return 'dashboard';
    if (path.includes('buy')) return 'buy';
    if (path.includes('admin')) return 'admin';
    if (path.includes('pricing')) return 'pricing';
    if (path.includes('contact')) return 'contact';
    return 'home';
  }

  init() {
    this.enhanceExistingNavigation();
    this.addBreadcrumbs();
    this.addNavigationState();
    this.addKeyboardNavigation();
  }

  enhanceExistingNavigation() {
    // Find existing navbar
    const navbar = document.querySelector('.navbar, .header');
    if (!navbar) return;

    // Add navigation enhancement without changing existing styles
    navbar.setAttribute('role', 'navigation');
    navbar.setAttribute('aria-label', 'Main navigation');

    // Enhance existing links
    const links = navbar.querySelectorAll('a');
    links.forEach(link => {
      // Add ARIA attributes
      link.setAttribute('role', 'menuitem');
      
      // Add active state indication
      if (this.isCurrentPage(link.href)) {
        link.setAttribute('aria-current', 'page');
        link.classList.add('nav-current');
      }

      // Add keyboard support
      link.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          link.click();
        }
      });
    });

    // Add user info if missing and user is logged in
    if (this.username && !navbar.querySelector('.nav-user-info')) {
      this.addUserInfo(navbar);
    }
  }

  addUserInfo(navbar) {
    const navRight = navbar.querySelector('.navbar-right, .header-right');
    if (!navRight) return;

    // Create user info element that matches existing style
    const userInfo = document.createElement('div');
    userInfo.className = 'nav-user-info';
    userInfo.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-right: 1rem;
      font-size: 0.9rem;
      color: #64748b;
    `;

    if (this.profilePic && this.profilePic !== 'null') {
      const avatar = document.createElement('img');
      avatar.src = this.profilePic;
      avatar.alt = `${this.username} profile picture`;
      avatar.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid rgba(0, 122, 255, 0.2);
      `;
      userInfo.appendChild(avatar);
    }

    const usernameSpan = document.createElement('span');
    usernameSpan.textContent = `@${this.username}`;
    usernameSpan.style.fontWeight = '500';
    userInfo.appendChild(usernameSpan);

    navRight.insertBefore(userInfo, navRight.firstChild);
  }

  addBreadcrumbs() {
    // Only add breadcrumbs if not on home page
    if (this.currentPage === 'home') return;

    const breadcrumbData = this.getBreadcrumbData();
    if (!breadcrumbData.length) return;

    // Find container after navbar
    const navbar = document.querySelector('.navbar, .header');
    if (!navbar) return;

    // Create breadcrumb container
    const breadcrumbContainer = document.createElement('nav');
    breadcrumbContainer.className = 'breadcrumb-nav';
    breadcrumbContainer.setAttribute('aria-label', 'Breadcrumb navigation');
    breadcrumbContainer.style.cssText = `
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.75rem 2rem;
      font-size: 0.9rem;
    `;

    const breadcrumbList = document.createElement('ol');
    breadcrumbList.className = 'breadcrumb-list';
    breadcrumbList.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    `;

    breadcrumbData.forEach((item, index) => {
      const listItem = document.createElement('li');
      listItem.className = 'breadcrumb-item';

      if (index < breadcrumbData.length - 1) {
        const link = document.createElement('a');
        link.href = item.url;
        link.textContent = item.label;
        link.style.cssText = `
          color: #64748b;
          text-decoration: none;
          transition: color 0.2s ease;
        `;
        link.addEventListener('mouseenter', () => link.style.color = '#007aff');
        link.addEventListener('mouseleave', () => link.style.color = '#64748b');
        listItem.appendChild(link);

        // Add separator
        const separator = document.createElement('span');
        separator.textContent = '›';
        separator.style.cssText = `
          color: #cbd5e1;
          margin-left: 0.5rem;
          user-select: none;
        `;
        listItem.appendChild(separator);
      } else {
        // Current page
        const current = document.createElement('span');
        current.textContent = item.label;
        current.setAttribute('aria-current', 'page');
        current.style.cssText = `
          color: #007aff;
          font-weight: 600;
        `;
        listItem.appendChild(current);
      }

      breadcrumbList.appendChild(listItem);
    });

    breadcrumbContainer.appendChild(breadcrumbList);
    navbar.parentNode.insertBefore(breadcrumbContainer, navbar.nextSibling);
  }

  getBreadcrumbData() {
    const breadcrumbs = {
      'dashboard': [
        { label: 'Home', url: '/' },
        { label: 'Dashboard', url: '/dashboard.html' }
      ],
      'buy': [
        { label: 'Home', url: '/' },
        { label: 'Dashboard', url: `/dashboard.html?name=${this.username}&pic=${encodeURIComponent(this.profilePic || '')}` },
        { label: 'Buy Packages', url: '/buy.html' }
      ],
      'pricing': [
        { label: 'Home', url: '/' },
        { label: 'Pricing', url: '/pricing.html' }
      ],
      'admin': [
        { label: 'Home', url: '/' },
        { label: 'Dashboard', url: `/dashboard.html?name=${this.username}&pic=${encodeURIComponent(this.profilePic || '')}` },
        { label: 'Admin Panel', url: '/admin.html' }
      ],
      'contact': [
        { label: 'Home', url: '/' },
        { label: 'Contact', url: '/contact.html' }
      ]
    };

    return breadcrumbs[this.currentPage] || [];
  }

  addNavigationState() {
    // Add CSS for navigation states
    const style = document.createElement('style');
    style.textContent = `
      .nav-current {
        position: relative;
      }
      
      .nav-current::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        right: 0;
        height: 2px;
        background: #007aff;
        border-radius: 1px;
      }
      
      .navbar a:focus,
      .header a:focus,
      .breadcrumb-list a:focus {
        outline: 2px solid #007aff;
        outline-offset: 2px;
        border-radius: 4px;
      }
      
      @media (max-width: 768px) {
        .breadcrumb-nav {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
        }
        
        .nav-user-info {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  addKeyboardNavigation() {
    // Enhanced keyboard navigation for existing elements
    document.addEventListener('keydown', (e) => {
      // Alt + H for home/dashboard
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        if (this.username) {
          window.location.href = `/dashboard.html?name=${this.username}&pic=${encodeURIComponent(this.profilePic || '')}`;
        } else {
          window.location.href = '/';
        }
      }
      
      // Alt + B for buy page
      if (e.altKey && e.key === 'b') {
        e.preventDefault();
        window.location.href = '/buy.html';
      }
      
      // Alt + P for pricing
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        window.location.href = '/pricing.html';
      }
    });
  }

  isCurrentPage(href) {
    if (!href) return false;
    const url = new URL(href, window.location.origin);
    return url.pathname === window.location.pathname;
  }
}

// Auto-initialize on pages with navigation
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if there's a navbar
  if (document.querySelector('.navbar, .header')) {
    new UnifiedNavigation();
  }
});

// Export for manual initialization
window.UnifiedNavigation = UnifiedNavigation;