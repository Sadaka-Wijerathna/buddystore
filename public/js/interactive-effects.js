/* ===== BUDDYSTORE INTERACTIVE EFFECTS ===== */

// Initialize all interactive effects when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initCustomCursor();
  initParticleTrail();
  initFloatingActions();
  initTypingAnimation();
  initPriceCalculationEffects();
  initFormValidationEffects();
  initProgressAnimations();
  initFloatingBreadcrumb();
  initPaymentRevealEffects();
  initRealTimeIndicators();
});

// Custom Cursor Effects
function initCustomCursor() {
  if (window.innerWidth <= 768) return; // Skip on mobile
  
  const cursor = document.createElement('div');
  cursor.className = 'custom-cursor';
  document.body.appendChild(cursor);
  
  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  
  document.addEventListener('mousedown', () => {
    cursor.classList.add('clicking');
  });
  
  document.addEventListener('mouseup', () => {
    cursor.classList.remove('clicking');
  });
  
  function updateCursor() {
    cursorX += (mouseX - cursorX) * 0.1;
    cursorY += (mouseY - cursorY) * 0.1;
    
    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';
    
    requestAnimationFrame(updateCursor);
  }
  
  updateCursor();
}

// Particle Trail Effect
function initParticleTrail() {
  if (window.innerWidth <= 768) return; // Skip on mobile
  
  document.addEventListener('mousemove', (e) => {
    if (Math.random() > 0.8) { // Only create particles 20% of the time
      createParticleTrail(e.clientX, e.clientY);
    }
  });
  
  function createParticleTrail(x, y) {
    const particle = document.createElement('div');
    particle.className = 'particle-trail';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    
    document.body.appendChild(particle);
    
    setTimeout(() => {
      particle.remove();
    }, 1000);
  }
}

// Floating Action Buttons
function initFloatingActions() {
  const floatingActions = document.createElement('div');
  floatingActions.className = 'floating-actions';
  
  // Create FAB buttons based on current page
  const currentPage = window.location.pathname;
  
  if (currentPage.includes('dashboard')) {
    floatingActions.innerHTML = `
      <button class="fab" title="Refresh Data" onclick="location.reload()">🔄</button>
      <button class="fab" title="Go to Buy" onclick="goToBuy()">🛒</button>
    `;
  } else if (currentPage.includes('buy')) {
    floatingActions.innerHTML = `
      <button class="fab" title="Back to Dashboard" onclick="goToDashboard()">🏠</button>
      <button class="fab" title="Contact Support" onclick="contactSupport()">💬</button>
    `;
  } else if (currentPage.includes('admin')) {
    floatingActions.innerHTML = `
      <button class="fab" title="Refresh Users" onclick="fetchUsers()">👥</button>
      <button class="fab" title="Export Data" onclick="exportData()">📊</button>
    `;
  } else {
    floatingActions.innerHTML = `
      <button class="fab" title="Login" onclick="scrollToLogin()">🔑</button>
    `;
  }
  
  document.body.appendChild(floatingActions);
}

// Typing Animation for Features
function initTypingAnimation() {
  const featureTexts = document.querySelectorAll('.feature-item span');
  
  featureTexts.forEach((text, index) => {
    setTimeout(() => {
      text.classList.add('typing-animation');
    }, index * 500);
  });
}

// Price Calculation Effects
function initPriceCalculationEffects() {
  const priceBox = document.getElementById('checkout');
  if (!priceBox) return;
  
  const originalUpdateCheckout = window.updateCheckout;
  if (originalUpdateCheckout) {
    window.updateCheckout = function() {
      originalUpdateCheckout();
      priceBox.classList.add('price-update');
      setTimeout(() => {
        priceBox.classList.remove('price-update');
      }, 500);
    };
  }
}

// Enhanced Form Validation Effects
function initFormValidationEffects() {
  const inputs = document.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    input.addEventListener('blur', function() {
      if (this.checkValidity()) {
        this.style.borderColor = '#34c759';
        this.style.boxShadow = '0 0 0 3px rgba(52, 199, 89, 0.1)';
      } else if (this.value) {
        this.style.borderColor = '#ff3b30';
        this.style.boxShadow = '0 0 0 3px rgba(255, 59, 48, 0.1)';
      }
    });
    
    input.addEventListener('focus', function() {
      this.style.borderColor = '#007aff';
      this.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.1)';
    });
  });
}

// Progress Bar Animations
function initProgressAnimations() {
  const progressBars = document.querySelectorAll('.progress-fill');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const progressBar = entry.target;
        const width = progressBar.style.width || '0%';
        progressBar.style.setProperty('--progress-width', width);
        progressBar.style.animation = 'progressFill 2s ease-out';
      }
    });
  });
  
  progressBars.forEach(bar => observer.observe(bar));
}

// Floating Breadcrumb Navigation
function initFloatingBreadcrumb() {
  if (window.innerWidth <= 768) return; // Skip on mobile
  
  const sections = document.querySelectorAll('.card, .category-group, .settings-section');
  if (sections.length === 0) return;
  
  const breadcrumb = document.createElement('div');
  breadcrumb.className = 'floating-breadcrumb';
  
  sections.forEach((section, index) => {
    const dot = document.createElement('div');
    dot.className = 'breadcrumb-dot';
    dot.addEventListener('click', () => {
      section.scrollIntoView({ behavior: 'smooth' });
    });
    breadcrumb.appendChild(dot);
  });
  
  document.body.appendChild(breadcrumb);
  
  // Update active dot on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Array.from(sections).indexOf(entry.target);
        const dots = breadcrumb.querySelectorAll('.breadcrumb-dot');
        dots.forEach(dot => dot.classList.remove('active'));
        if (dots[index]) dots[index].classList.add('active');
      }
    });
  }, { threshold: 0.5 });
  
  sections.forEach(section => observer.observe(section));
}

// Payment Method Reveal Effects
function initPaymentRevealEffects() {
  const paymentMethods = document.querySelectorAll('#paymentDetails > div, .payment-method');
  
  paymentMethods.forEach((method, index) => {
    method.style.animationDelay = `${index * 0.1}s`;
    method.classList.add('payment-method');
  });
}

// Real-time Update Indicators
function initRealTimeIndicators() {
  const liveElements = document.querySelectorAll('.stat-number, .user-stats-number, #announcement-text');
  
  liveElements.forEach(element => {
    element.classList.add('live-indicator');
  });
}

// Utility Functions for FAB actions
function goToBuy() {
  const username = localStorage.getItem('username');
  if (username) {
    window.location.href = `/buy.html?username=${username}`;
  } else {
    window.location.href = '/buy.html';
  }
}

function goToDashboard() {
  const username = localStorage.getItem('username');
  const pic = localStorage.getItem('profilePic');
  if (username) {
    window.location.href = `/dashboard.html?name=${username}&pic=${encodeURIComponent(pic)}`;
  } else {
    window.location.href = '/dashboard.html';
  }
}

function contactSupport() {
  window.open('https://t.me/buddyseller', '_blank');
}

function scrollToLogin() {
  const loginBox = document.querySelector('.login-box');
  if (loginBox) {
    loginBox.scrollIntoView({ behavior: 'smooth' });
  }
}

// Enhanced skeleton loading for better UX
function showSkeletonLoading(element) {
  if (!element) return;
  
  element.classList.add('skeleton');
  element.innerHTML = '';
  
  // Create skeleton content based on element type
  if (element.classList.contains('stat-number')) {
    element.style.height = '2rem';
    element.style.width = '4rem';
  } else if (element.classList.contains('package-card')) {
    element.innerHTML = `
      <div class="skeleton" style="height: 1.5rem; margin-bottom: 1rem;"></div>
      <div class="skeleton" style="height: 1rem; margin-bottom: 0.5rem;"></div>
      <div class="skeleton" style="height: 1rem; margin-bottom: 0.5rem;"></div>
      <div class="skeleton" style="height: 1rem;"></div>
    `;
  }
}

function hideSkeletonLoading(element) {
  if (!element) return;
  element.classList.remove('skeleton');
}

// Add loading states to existing functions
const originalFetch = window.fetch;
window.fetch = function(...args) {
  // Show loading indicator
  const loadingElements = document.querySelectorAll('.stat-number, .user-stats-number');
  loadingElements.forEach(el => showSkeletonLoading(el));
  
  return originalFetch.apply(this, args)
    .then(response => {
      // Hide loading indicator
      setTimeout(() => {
        loadingElements.forEach(el => hideSkeletonLoading(el));
      }, 500);
      return response;
    })
    .catch(error => {
      // Hide loading indicator on error
      loadingElements.forEach(el => hideSkeletonLoading(el));
      throw error;
    });
};

// Enhanced button click effects
document.addEventListener('click', function(e) {
  const button = e.target.closest('button, .btn, .telegram-login');
  if (button) {
    // Create ripple effect
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
});

// Add CSS for ripple effect
const rippleCSS = `
.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transform: scale(0);
  animation: ripple-animation 0.6s linear;
  pointer-events: none;
}

@keyframes ripple-animation {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
`;

const style = document.createElement('style');
style.textContent = rippleCSS;
document.head.appendChild(style);

// Performance monitoring
function optimizeAnimations() {
  let isScrolling = false;
  
  window.addEventListener('scroll', () => {
    if (!isScrolling) {
      // Pause non-essential animations during scroll
      document.body.style.setProperty('--animation-play-state', 'paused');
      isScrolling = true;
    }
    
    clearTimeout(window.scrollTimeout);
    window.scrollTimeout = setTimeout(() => {
      // Resume animations after scroll ends
      document.body.style.setProperty('--animation-play-state', 'running');
      isScrolling = false;
    }, 150);
  });
}

// Initialize performance optimizations
optimizeAnimations();