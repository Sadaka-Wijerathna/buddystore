/* ===== BUDDYSTORE PAGE TRANSITIONS & MICRO-INTERACTIONS ===== */
/* This script adds smooth page transitions and interactive animations */

(function() {
  'use strict';

  // ===== PAGE TRANSITION SYSTEM =====
  
  // Page transition overlay (disabled)
  function createTransitionOverlay() {
    return null;
  }

  // Show page transition (disabled)
  function showPageTransition() {
    // Disabled
  }

  // Hide page transition
  function hidePageTransition() {
    const overlay = document.getElementById('page-transition-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.visibility = 'hidden';
    }
  }

  // Handle link clicks for smooth transitions
  function handleLinkTransitions() {
    const links = document.querySelectorAll('a[href]:not([href^="#"]):not([href^="mailto:"]):not([href^="tel:"]):not([target="_blank"])');
    
    links.forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        
        // Skip if it's an external link or has special attributes
        if (href.startsWith('http') && !href.includes(window.location.hostname)) {
          return;
        }
        
        e.preventDefault();
        showPageTransition();
        
        // Navigate after a short delay
        setTimeout(() => {
          window.location.href = href;
        }, 300);
      });
    });
  }

  // ===== SCROLL ANIMATIONS =====
  
  function initScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      requestAnimationFrame(() => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
            observer.unobserve(entry.target);
          }
        });
      });
    }, observerOptions);

    // Observe elements that should animate on scroll
    const animateElements = document.querySelectorAll('.package-card, .card, .category-group');
    animateElements.forEach(el => {
      el.classList.add('scroll-animate');
      observer.observe(el);
    });
  }

  // ===== BUTTON RIPPLE EFFECT =====
  
  function addRippleEffect() {
    const buttons = document.querySelectorAll('.btn, button, .telegram-login');
    
    buttons.forEach(button => {
      button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          left: ${x}px;
          top: ${y}px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: scale(0);
          animation: ripple 0.6s cubic-bezier(0.215, 0.61, 0.355, 1);
          pointer-events: none;
        `;
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    });
  }

  // ===== FORM ENHANCEMENTS =====
  
  function enhanceForms() {
    const inputs = document.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      // Add focus/blur animations
      input.addEventListener('focus', function() {
        this.parentElement.classList.add('focused');
      });
      
      input.addEventListener('blur', function() {
        if (!this.value) {
          this.parentElement.classList.remove('focused');
        }
      });
      
      // Add typing animation
      input.addEventListener('input', function() {
        this.classList.add('typing');
        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => {
          this.classList.remove('typing');
        }, 500);
      }, { passive: true });
    });
  }

  // ===== CARD HOVER ENHANCEMENTS =====
  
  function enhanceCards() {
    const cards = document.querySelectorAll('.package-card, .card, .login-box');
    
    cards.forEach(card => {
      card.style.willChange = 'transform';
      card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
      });
      
      card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
      });
    });
  }

  // ===== NOTIFICATION SYSTEM =====
  
  function createNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      border-left: 4px solid #007aff;
      z-index: 1000;
      transform: translateX(100%);
      transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      max-width: 300px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: #333;
    `;
    
    if (type === 'success') {
      notification.style.borderLeftColor = '#34c759';
    } else if (type === 'error') {
      notification.style.borderLeftColor = '#ff3b30';
    } else if (type === 'warning') {
      notification.style.borderLeftColor = '#ff9500';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide notification
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, duration);
  }

  // ===== LOADING STATES =====
  
  function addLoadingStates() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      form.addEventListener('submit', function() {
        const submitBtn = this.querySelector('button[type="submit"], input[type="submit"]');
        if (submitBtn) {
          submitBtn.style.opacity = '0.7';
          submitBtn.style.pointerEvents = 'none';
          submitBtn.innerHTML = '<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></span>Loading...';
        }
      });
    });
  }

  // ===== SMOOTH SCROLLING =====
  
  function initSmoothScrolling() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  }

  // ===== PARTICLE INTERACTIONS =====
  
  function enhanceParticles() {
    const particles = document.querySelectorAll('.particle');
    
    particles.forEach(particle => {
      particle.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(2)';
        this.style.opacity = '0.8';
      });
      
      particle.addEventListener('mouseleave', function() {
        this.style.transform = '';
        this.style.opacity = '';
      });
    });
  }

  // ===== INITIALIZATION =====
  
  function init() {
    // Hide page transition on load
    hidePageTransition();
    
    // Initialize all features
    handleLinkTransitions();
    addRippleEffect();
    enhanceForms();
    enhanceCards();
    addLoadingStates();
    initSmoothScrolling();
    enhanceParticles();
    
    // Initialize scroll animations after a short delay
    setTimeout(() => {
      initScrollAnimations();
    }, 500);
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      
      .scroll-animate {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.6s cubic-bezier(0.215, 0.61, 0.355, 1);
        will-change: opacity, transform;
      }
      
      .scroll-animate.animate-fade-in {
        opacity: 1;
        transform: translateY(0);
      }
      
      .typing {
        border-color: #007aff !important;
        box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1) !important;
      }
      
      .focused label {
        color: #007aff;
        transform: translateY(-20px) scale(0.85);
      }
    `;
    document.head.appendChild(style);
  }

  // ===== GLOBAL FUNCTIONS =====
  
  // Expose notification function globally
  window.showNotification = createNotification;
  
  // Expose page transition functions globally
  window.showPageTransition = showPageTransition;
  window.hidePageTransition = hidePageTransition;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Handle page visibility changes
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      hidePageTransition();
    }
  });

})();
