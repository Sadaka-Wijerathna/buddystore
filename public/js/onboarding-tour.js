/* ===== PROGRESSIVE ONBOARDING TOUR ===== */
/* Non-intrusive onboarding that preserves existing design */

class OnboardingTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.overlay = null;
    this.tooltip = null;
    this.steps = this.getStepsForPage();
    this.init();
  }

  init() {
    // Only show onboarding for new users
    if (this.shouldShowOnboarding()) {
      // Small delay to ensure page is fully loaded
      setTimeout(() => {
        this.start();
      }, 1000);
    }
  }

  shouldShowOnboarding() {
    const hasSeenOnboarding = localStorage.getItem('onboarding_completed');
    const isLoggedIn = localStorage.getItem('username');
    const currentPage = window.location.pathname;
    
    // Show onboarding on dashboard for new users
    return !hasSeenOnboarding && isLoggedIn && currentPage.includes('dashboard');
  }

  getStepsForPage() {
    const username = localStorage.getItem('username');
    
    return [
      {
        target: '.profile-card, .card:first-child',
        title: `Welcome to BuddyStore, @${username}! 🎉`,
        content: 'This is your personal dashboard where you can track your purchases, achievements, and account statistics.',
        position: 'bottom',
        highlight: true
      },
      {
        target: '.stats-grid, .stat-card:first-child',
        title: 'Your Statistics 📊',
        content: 'Here you can see your total packages, videos, spending, and membership status at a glance.',
        position: 'bottom',
        highlight: true
      },
      {
        target: '[href*="buy"], #buyLink, .navbar a[href*="buy"]',
        title: 'Buy More Content 🛒',
        content: 'Click here to browse and purchase new video packages. You can also get free samples!',
        position: 'bottom',
        highlight: true
      },
      {
        target: '.achievement-badge, .membership-badge',
        title: 'Achievements & Badges 🏆',
        content: 'Earn badges and achievements as you use BuddyStore. These show your membership level and activity.',
        position: 'top',
        highlight: true
      },
      {
        target: '.announcement-banner, .announcement',
        title: 'Stay Updated 📢',
        content: 'Check announcements for new packages, special offers, and important updates.',
        position: 'bottom',
        highlight: false
      }
    ];
  }

  start() {
    this.isActive = true;
    this.createOverlay();
    this.showStep(0);
    
    // Track onboarding start
    this.trackEvent('onboarding_started');
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'onboarding-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(2px);
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(this.overlay);
    
    // Fade in overlay
    setTimeout(() => {
      this.overlay.style.opacity = '1';
    }, 10);
  }

  showStep(stepIndex) {
    if (stepIndex >= this.steps.length) {
      this.complete();
      return;
    }

    this.currentStep = stepIndex;
    const step = this.steps[stepIndex];
    const target = document.querySelector(step.target);

    if (!target) {
      // Skip this step if target not found
      this.showStep(stepIndex + 1);
      return;
    }

    this.highlightElement(target, step.highlight);
    this.showTooltip(target, step);
  }

  highlightElement(element, shouldHighlight = true) {
    // Remove previous highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    if (shouldHighlight) {
      element.classList.add('onboarding-highlight');
      
      // Scroll element into view smoothly
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }

  showTooltip(target, step) {
    // Remove existing tooltip
    if (this.tooltip) {
      this.tooltip.remove();
    }

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'onboarding-tooltip';
    this.tooltip.style.cssText = `
      position: absolute;
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      max-width: 320px;
      z-index: 10001;
      pointer-events: auto;
      font-family: 'Inter', sans-serif;
      backdrop-filter: blur(20px);
    `;

    // Tooltip content
    this.tooltip.innerHTML = `
      <div class="tooltip-header" style="margin-bottom: 1rem;">
        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600; color: #0f172a;">
          ${step.title}
        </h3>
      </div>
      <div class="tooltip-content" style="margin-bottom: 1.5rem;">
        <p style="margin: 0; font-size: 0.9rem; line-height: 1.5; color: #64748b;">
          ${step.content}
        </p>
      </div>
      <div class="tooltip-actions" style="display: flex; justify-content: space-between; align-items: center;">
        <div class="step-indicator" style="font-size: 0.8rem; color: #94a3b8;">
          ${this.currentStep + 1} of ${this.steps.length}
        </div>
        <div class="tooltip-buttons" style="display: flex; gap: 0.5rem;">
          ${this.currentStep > 0 ? `
            <button class="tooltip-btn-back" style="
              background: rgba(0, 122, 255, 0.1);
              color: #007aff;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 8px;
              font-size: 0.8rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s ease;
            ">Back</button>
          ` : ''}
          <button class="tooltip-btn-skip" style="
            background: rgba(148, 163, 184, 0.1);
            color: #64748b;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          ">Skip Tour</button>
          <button class="tooltip-btn-next" style="
            background: linear-gradient(135deg, #007aff, #0066ff);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
          ">${this.currentStep === this.steps.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    `;

    // Position tooltip
    this.positionTooltip(target, step.position);

    // Add event listeners
    this.addTooltipListeners();

    document.body.appendChild(this.tooltip);

    // Add hover effects
    this.addButtonHoverEffects();
  }

  positionTooltip(target, position = 'bottom') {
    const rect = target.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    
    let top, left;

    switch (position) {
      case 'top':
        top = rect.top - tooltipRect.height - 20;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.left - tooltipRect.width - 20;
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
        left = rect.right + 20;
        break;
      default:
        top = rect.bottom + 20;
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    }

    // Ensure tooltip stays within viewport
    const margin = 20;
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipRect.height - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));

    this.tooltip.style.top = top + 'px';
    this.tooltip.style.left = left + 'px';
  }

  addTooltipListeners() {
    const nextBtn = this.tooltip.querySelector('.tooltip-btn-next');
    const backBtn = this.tooltip.querySelector('.tooltip-btn-back');
    const skipBtn = this.tooltip.querySelector('.tooltip-btn-skip');

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.trackEvent('onboarding_step_completed', { step: this.currentStep });
        this.showStep(this.currentStep + 1);
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.showStep(this.currentStep - 1);
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.trackEvent('onboarding_skipped', { step: this.currentStep });
        this.complete();
      });
    }
  }

  addButtonHoverEffects() {
    const buttons = this.tooltip.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-1px)';
        if (btn.classList.contains('tooltip-btn-next')) {
          btn.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.4)';
        }
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        if (btn.classList.contains('tooltip-btn-next')) {
          btn.style.boxShadow = '0 2px 8px rgba(0, 122, 255, 0.3)';
        }
      });
    });
  }

  complete() {
    this.isActive = false;
    
    // Remove highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });

    // Remove tooltip
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
      this.tooltip.style.transform = 'scale(0.9)';
      setTimeout(() => {
        if (this.tooltip) this.tooltip.remove();
      }, 200);
    }

    // Remove overlay
    if (this.overlay) {
      this.overlay.style.opacity = '0';
      setTimeout(() => {
        if (this.overlay) this.overlay.remove();
      }, 300);
    }

    // Mark as completed
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_date', new Date().toISOString());

    // Track completion
    this.trackEvent('onboarding_completed');

    // Show completion message
    this.showCompletionMessage();
  }

  showCompletionMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #34c759, #28a745);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(52, 199, 89, 0.3);
      z-index: 10000;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    message.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span>🎉</span>
        <span>Welcome tour completed!</span>
      </div>
    `;

    document.body.appendChild(message);

    // Animate in
    setTimeout(() => {
      message.style.transform = 'translateX(0)';
    }, 10);

    // Remove after delay
    setTimeout(() => {
      message.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (message.parentNode) {
          message.parentNode.removeChild(message);
        }
      }, 300);
    }, 3000);
  }

  trackEvent(eventName, data = {}) {
    // Track onboarding events for analytics
    console.log('Onboarding Event:', eventName, data);
    
    // You can integrate with your analytics service here
    if (window.gtag) {
      window.gtag('event', eventName, {
        event_category: 'onboarding',
        ...data
      });
    }
  }

  // Public method to restart onboarding
  restart() {
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_completed_date');
    location.reload();
  }
}

// Add CSS for onboarding highlights
const onboardingStyles = document.createElement('style');
onboardingStyles.textContent = `
  .onboarding-highlight {
    position: relative;
    z-index: 9999 !important;
    box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.3), 0 0 0 8px rgba(0, 122, 255, 0.1) !important;
    border-radius: 12px !important;
    animation: onboarding-pulse 2s ease-in-out infinite;
  }
  
  @keyframes onboarding-pulse {
    0%, 100% {
      box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.3), 0 0 0 8px rgba(0, 122, 255, 0.1);
    }
    50% {
      box-shadow: 0 0 0 6px rgba(0, 122, 255, 0.4), 0 0 0 12px rgba(0, 122, 255, 0.15);
    }
  }
  
  .onboarding-tooltip {
    animation: tooltip-appear 0.3s ease-out;
  }
  
  @keyframes tooltip-appear {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @media (max-width: 768px) {
    .onboarding-tooltip {
      max-width: 280px;
      padding: 1rem;
    }
  }
`;
document.head.appendChild(onboardingStyles);

// Auto-initialize on dashboard
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('dashboard')) {
    new OnboardingTour();
  }
});

// Export for manual control
window.OnboardingTour = OnboardingTour;