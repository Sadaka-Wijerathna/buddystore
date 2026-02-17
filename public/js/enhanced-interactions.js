/* ===== BUDDYSTORE ENHANCED INTERACTIONS ===== */

// Initialize all interactive effects when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initRippleEffects();
  initEnhancedParticles();
  initParticleTrail();
  initEnhancedAnimations();
});

// ===== RIPPLE EFFECTS =====
function initRippleEffects() {
  // Add ripple effect to all clickable elements
  const clickableElements = document.querySelectorAll('button, .btn, .telegram-login, .header-btn, .add-user-btn, .logout-button, .pin-btn, .fab');
  
  clickableElements.forEach(element => {
    // Make sure element has relative positioning for ripple
    if (getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
    }
    element.style.overflow = 'hidden';
    
    element.addEventListener('click', function(e) {
      createRipple(e, this);
    });
  });
}

function createRipple(event, element) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple');
  
  element.appendChild(ripple);
  
  // Remove ripple after animation
  setTimeout(() => {
    if (ripple.parentNode) {
      ripple.parentNode.removeChild(ripple);
    }
  }, 600);
}

// ===== ENHANCED PARTICLE SYSTEM =====
function initEnhancedParticles() {
  const particlesContainer = document.querySelector('.particles');
  if (!particlesContainer) return;
  
  // Clear existing particles
  particlesContainer.innerHTML = '';
  
  // Create particles with random starting positions
  const particleCount = window.innerWidth <= 768 ? 15 : 25;
  
  for (let i = 0; i < particleCount; i++) {
    createEnhancedParticle(particlesContainer, i);
  }
}

function createEnhancedParticle(container, index) {
  const particle = document.createElement('div');
  particle.className = 'particle';
  
  // Random properties
  const size = Math.random() * 12 + 3; // 3-15px
  const left = Math.random() * 100; // 0-100%
  const duration = Math.random() * 10 + 10; // 10-20s
  const delay = Math.random() * duration; // Random delay up to duration
  
  // Set styles
  particle.style.width = size + 'px';
  particle.style.height = size + 'px';
  particle.style.left = left + '%';
  particle.style.animationDuration = duration + 's';
  particle.style.animationDelay = '-' + delay + 's'; // Negative delay starts animation mid-cycle
  
  // Add some variety to colors
  const hue = Math.random() * 60 + 200; // Blue to cyan range
  particle.style.background = `radial-gradient(circle, hsla(${hue}, 100%, 60%, 0.6), hsla(${hue}, 100%, 70%, 0.3), transparent)`;
  
  container.appendChild(particle);
}

// ===== PARTICLE TRAIL EFFECT =====
function initParticleTrail() {
  if (window.innerWidth <= 768) return; // Skip on mobile for performance
  
  let lastTrailTime = 0;
  const trailDelay = 100; // Minimum time between trail particles
  
  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastTrailTime > trailDelay && Math.random() > 0.7) {
      createParticleTrail(e.clientX, e.clientY);
      lastTrailTime = now;
    }
  });
}

function createParticleTrail(x, y) {
  const particle = document.createElement('div');
  particle.className = 'particle-trail';
  particle.style.left = x + 'px';
  particle.style.top = y + 'px';
  
  // Random size and color
  const size = Math.random() * 4 + 2;
  particle.style.width = size + 'px';
  particle.style.height = size + 'px';
  
  document.body.appendChild(particle);
  
  setTimeout(() => {
    if (particle.parentNode) {
      particle.parentNode.removeChild(particle);
    }
  }, 1000);
}

// ===== ENHANCED ANIMATIONS =====
function initEnhancedAnimations() {
  // Enhanced button hover effects
  const buttons = document.querySelectorAll('button, .btn, .telegram-login');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-3px) scale(1.02)';
    });
    
    button.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
  
  // Enhanced card hover effects
  const cards = document.querySelectorAll('.package-card, .card, .stat-card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
  
  // Enhanced form focus effects
  const inputs = document.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.style.transform = 'scale(1.01)';
      this.style.boxShadow = '0 0 0 3px rgba(0, 122, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.1)';
    });
    
    input.addEventListener('blur', function() {
      this.style.transform = 'scale(1)';
      this.style.boxShadow = '';
    });
  });
}

// ===== PRICE CALCULATION ANIMATIONS =====
function animatePriceUpdate(element) {
  if (!element) return;
  
  element.classList.add('price-update');
  setTimeout(() => {
    element.classList.remove('price-update');
  }, 500);
}

// ===== ENHANCED LOADING STATES =====
function showEnhancedLoading(element) {
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

function hideEnhancedLoading(element) {
  if (!element) return;
  element.classList.remove('skeleton');
}

// ===== ENHANCED NOTIFICATION SYSTEM =====
function showEnhancedNotification(message, type = 'info', duration = 5000) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div style="position: relative; z-index: 2;">
      ${message}
    </div>
  `;
  
  // Position notification
  notification.style.position = 'fixed';
  notification.style.top = '1rem';
  notification.style.right = '1rem';
  notification.style.zIndex = '1001';
  notification.style.transform = 'translateX(100%)';
  notification.style.transition = 'transform 0.3s ease';
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);
  
  // Animate out and remove
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

// ===== UTILITY FUNCTIONS =====

// Debounce function for performance
function debounce(func, wait) {
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

// Throttle function for performance
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// ===== PERFORMANCE MONITORING =====
function optimizeAnimations() {
  let isScrolling = false;
  
  window.addEventListener('scroll', throttle(() => {
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
  }, 16)); // ~60fps
}

// ===== ENHANCED PARTICLE REFRESH =====
function refreshParticles() {
  const particlesContainer = document.querySelector('.particles');
  if (particlesContainer) {
    initEnhancedParticles();
  }
}

// ===== GLOBAL ENHANCEMENTS =====

// Override existing functions if they exist
if (typeof window.updateCheckout === 'function') {
  const originalUpdateCheckout = window.updateCheckout;
  window.updateCheckout = function() {
    originalUpdateCheckout();
    const priceBox = document.getElementById('checkout');
    if (priceBox) {
      animatePriceUpdate(priceBox);
    }
  };
}

// Enhanced fetch with loading states
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const loadingElements = document.querySelectorAll('.stat-number, .user-stats-number');
  loadingElements.forEach(el => showEnhancedLoading(el));
  
  return originalFetch.apply(this, args)
    .then(response => {
      setTimeout(() => {
        loadingElements.forEach(el => hideEnhancedLoading(el));
      }, 500);
      return response;
    })
    .catch(error => {
      loadingElements.forEach(el => hideEnhancedLoading(el));
      throw error;
    });
};

// Initialize performance optimizations
optimizeAnimations();

// Refresh particles on window resize
window.addEventListener('resize', debounce(refreshParticles, 250));

// Export functions for global use
window.createRipple = createRipple;
window.animatePriceUpdate = animatePriceUpdate;
window.showEnhancedNotification = showEnhancedNotification;
window.refreshParticles = refreshParticles;