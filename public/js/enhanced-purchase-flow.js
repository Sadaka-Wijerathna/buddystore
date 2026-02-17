/* ===== ENHANCED PURCHASE FLOW ===== */
/* Streamlined sample access and cart experience */

class EnhancedPurchaseFlow {
  constructor() {
    this.currentStep = 1;
    this.sampleFlowActive = false;
    this.cartPreviewVisible = false;
    this.init();
  }

  init() {
    this.enhanceSampleFlow();
    this.addCartPreview();
    this.addPurchaseHelpers();
    this.addKeyboardShortcuts();
  }

  enhanceSampleFlow() {
    // Find existing sample button
    const showSamplesBtn = document.getElementById('showSamplesBtn');
    if (!showSamplesBtn) return;

    // Replace complex modal with progressive flow
    showSamplesBtn.onclick = () => this.startSampleFlow();

    // Create progressive sample flow container
    this.createSampleFlowContainer();
  }

  createSampleFlowContainer() {
    const samplesAccess = document.getElementById('samplesAccess');
    if (!samplesAccess) return;

    // Create progressive flow container
    const flowContainer = document.createElement('div');
    flowContainer.id = 'progressiveSampleFlow';
    flowContainer.className = 'progressive-sample-flow';
    flowContainer.style.cssText = `
      display: none;
      margin-top: 1rem;
    `;

    // Step 1: Introduction
    const step1 = document.createElement('div');
    step1.className = 'sample-step sample-step-1';
    step1.innerHTML = `
      <div style="text-align: center; padding: 1.5rem; background: linear-gradient(135deg, rgba(155, 89, 182, 0.1), rgba(142, 68, 173, 0.1)); border-radius: 16px; border: 2px solid rgba(155, 89, 182, 0.2);">
        <div style="font-size: 2rem; margin-bottom: 1rem;">🎁</div>
        <h3 style="margin: 0 0 0.5rem 0; color: #9b59b6; font-weight: 600;">Get Free Samples</h3>
        <p style="margin: 0 0 1rem 0; color: #666; font-size: 0.9rem;">
          Try before you buy! Get sample videos from any category to see the quality.
        </p>
        <button class="btn-continue-sample" style="
          background: linear-gradient(135deg, #9b59b6, #8e44ad);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(155, 89, 182, 0.3);
        ">Continue to Samples</button>
      </div>
    `;

    // Step 2: Channel joining
    const step2 = document.createElement('div');
    step2.className = 'sample-step sample-step-2';
    step2.style.display = 'none';
    step2.innerHTML = `
      <div style="padding: 1.5rem; background: linear-gradient(135deg, rgba(0, 122, 255, 0.1), rgba(0, 198, 255, 0.1)); border-radius: 16px; border: 2px solid rgba(0, 122, 255, 0.2);">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 2rem; margin-bottom: 1rem;">📱</div>
          <h3 style="margin: 0 0 0.5rem 0; color: #007aff; font-weight: 600;">Join Our Community</h3>
          <p style="margin: 0; color: #666; font-size: 0.9rem;">
            To access free samples, please join our Telegram channels first:
          </p>
        </div>
        
        <div style="display: grid; gap: 1rem; margin-bottom: 1.5rem;">
          <a href="https://t.me/BuddySellingsC" target="_blank" class="channel-join-btn" style="
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: white;
            border: 2px solid rgba(0, 122, 255, 0.2);
            border-radius: 12px;
            text-decoration: none;
            color: #333;
            transition: all 0.3s ease;
          ">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #007aff, #0066ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">C</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #007aff;">BuddyStore Channel</div>
              <div style="font-size: 0.8rem; color: #666;">Latest updates and announcements</div>
            </div>
            <div style="color: #007aff;">→</div>
          </a>
          
          <a href="https://t.me/BuddySellingsG" target="_blank" class="channel-join-btn" style="
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: white;
            border: 2px solid rgba(0, 122, 255, 0.2);
            border-radius: 12px;
            text-decoration: none;
            color: #333;
            transition: all 0.3s ease;
          ">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #007aff, #0066ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">G</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #007aff;">BuddyStore Group</div>
              <div style="font-size: 0.8rem; color: #666;">Community discussions and support</div>
            </div>
            <div style="color: #007aff;">→</div>
          </a>
        </div>
        
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn-back-sample" style="
            background: rgba(148, 163, 184, 0.1);
            color: #64748b;
            border: none;
            padding: 0.75rem 1rem;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          ">Back</button>
          <button class="btn-verify-sample" style="
            flex: 1;
            background: linear-gradient(135deg, #34c759, #28a745);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3);
          ">I've Joined Both Channels</button>
        </div>
      </div>
    `;

    // Step 3: Verification and sample selection
    const step3 = document.createElement('div');
    step3.className = 'sample-step sample-step-3';
    step3.style.display = 'none';
    step3.innerHTML = `
      <div style="padding: 1.5rem; background: linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(40, 167, 69, 0.1)); border-radius: 16px; border: 2px solid rgba(52, 199, 89, 0.2);">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 2rem; margin-bottom: 1rem;">✅</div>
          <h3 style="margin: 0 0 0.5rem 0; color: #34c759; font-weight: 600;">Almost There!</h3>
          <p style="margin: 0; color: #666; font-size: 0.9rem;">
            Click below to verify your membership and unlock free samples:
          </p>
        </div>
        
        <div style="display: flex; gap: 0.75rem;">
          <button class="btn-back-sample-2" style="
            background: rgba(148, 163, 184, 0.1);
            color: #64748b;
            border: none;
            padding: 0.75rem 1rem;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          ">Back</button>
          <button class="btn-final-verify" style="
            flex: 1;
            background: linear-gradient(135deg, #34c759, #28a745);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3);
          ">Verify & Get Samples</button>
        </div>
        
        <div class="verification-status" style="margin-top: 1rem; text-align: center; display: none;">
          <div class="verification-loading" style="color: #007aff;">
            <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(0, 122, 255, 0.3); border-top: 2px solid #007aff; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 0.5rem;"></span>
            Verifying membership...
          </div>
        </div>
      </div>
    `;

    flowContainer.appendChild(step1);
    flowContainer.appendChild(step2);
    flowContainer.appendChild(step3);

    samplesAccess.appendChild(flowContainer);

    // Add event listeners
    this.addSampleFlowListeners();
    this.addChannelLinkHoverEffects();
  }

  startSampleFlow() {
    const username = localStorage.getItem('username');
    if (!username) {
      this.showNotification('Please login with your Telegram account first to access samples.', 'warning');
      return;
    }

    this.sampleFlowActive = true;
    this.currentStep = 1;

    // Hide original button and show progressive flow
    document.getElementById('showSamplesBtn').style.display = 'none';
    document.getElementById('progressiveSampleFlow').style.display = 'block';

    // Show step 1
    this.showSampleStep(1);
  }

  showSampleStep(step) {
    // Hide all steps
    document.querySelectorAll('.sample-step').forEach(el => {
      el.style.display = 'none';
    });

    // Show current step with animation
    const currentStepEl = document.querySelector(`.sample-step-${step}`);
    if (currentStepEl) {
      currentStepEl.style.display = 'block';
      currentStepEl.style.opacity = '0';
      currentStepEl.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        currentStepEl.style.transition = 'all 0.3s ease';
        currentStepEl.style.opacity = '1';
        currentStepEl.style.transform = 'translateY(0)';
      }, 10);
    }

    this.currentStep = step;
  }

  addSampleFlowListeners() {
    // Step 1 -> Step 2
    document.querySelector('.btn-continue-sample')?.addEventListener('click', () => {
      this.showSampleStep(2);
    });

    // Step 2 -> Step 1
    document.querySelector('.btn-back-sample')?.addEventListener('click', () => {
      this.showSampleStep(1);
    });

    // Step 2 -> Step 3
    document.querySelector('.btn-verify-sample')?.addEventListener('click', () => {
      this.showSampleStep(3);
    });

    // Step 3 -> Step 2
    document.querySelector('.btn-back-sample-2')?.addEventListener('click', () => {
      this.showSampleStep(2);
    });

    // Final verification
    document.querySelector('.btn-final-verify')?.addEventListener('click', () => {
      this.verifyChannelMembership();
    });
  }

  addChannelLinkHoverEffects() {
    document.querySelectorAll('.channel-join-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 4px 12px rgba(0, 122, 255, 0.15)';
        btn.style.borderColor = 'rgba(0, 122, 255, 0.3)';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = 'none';
        btn.style.borderColor = 'rgba(0, 122, 255, 0.2)';
      });
    });
  }

  async verifyChannelMembership() {
    const username = localStorage.getItem('username');
    const statusEl = document.querySelector('.verification-status');
    const loadingEl = document.querySelector('.verification-loading');
    const verifyBtn = document.querySelector('.btn-final-verify');

    // Show loading state
    statusEl.style.display = 'block';
    loadingEl.style.display = 'block';
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';

    try {
      const response = await fetch('/api/check-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await response.json();

      if (data.hasJoined) {
        // Success - show samples section
        this.completeSampleFlow();
      } else {
        // Failed verification
        loadingEl.innerHTML = `
          <div style="color: #ff3b30;">
            ❌ Please make sure you've joined both channels and try again.
          </div>
        `;
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Try Again';
      }
    } catch (error) {
      console.error('Channel verification error:', error);
      loadingEl.innerHTML = `
        <div style="color: #ff3b30;">
          ❌ Verification failed. Please try again.
        </div>
      `;
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Try Again';
    }
  }

  completeSampleFlow() {
    // Hide progressive flow
    document.getElementById('progressiveSampleFlow').style.display = 'none';
    document.getElementById('samplesAccess').style.display = 'none';

    // Show samples container
    const samplesContainer = document.getElementById('samplesContainer');
    if (samplesContainer) {
      samplesContainer.style.display = 'block';
      
      // Update available sample packages
      if (window.updateAvailableSamplePackages) {
        window.updateAvailableSamplePackages();
      }

      // Smooth scroll to samples
      setTimeout(() => {
        samplesContainer.scrollIntoView({ behavior: 'smooth' });
      }, 300);

      this.showNotification('🎉 Verification successful! You can now access free samples.', 'success');
    }
  }

  addCartPreview() {
    // Find existing cart container
    const cartContainer = document.getElementById('cartContainer');
    if (!cartContainer) return;

    // Create cart preview that appears when items are added
    const cartPreview = document.createElement('div');
    cartPreview.id = 'cartPreview';
    cartPreview.className = 'cart-preview';
    cartPreview.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 16px;
      padding: 1rem;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      z-index: 1000;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      max-width: 300px;
      display: none;
    `;

    cartPreview.innerHTML = `
      <div class="cart-preview-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <h4 style="margin: 0; font-size: 0.9rem; font-weight: 600; color: #0066ff;">🛒 Shopping Cart</h4>
        <span class="cart-preview-count" style="background: #ff4757; color: white; border-radius: 50%; padding: 0.2rem 0.4rem; font-size: 0.7rem; font-weight: 600; min-width: 1.2rem; text-align: center;">0</span>
      </div>
      <div class="cart-preview-items" style="margin-bottom: 0.75rem; max-height: 120px; overflow-y: auto;">
        <!-- Items will be added here -->
      </div>
      <div class="cart-preview-total" style="font-weight: 600; color: #0066ff; margin-bottom: 0.75rem; text-align: center; padding: 0.5rem; background: rgba(0, 102, 255, 0.1); border-radius: 8px;">
        Total: Rs.0.00
      </div>
      <div class="cart-preview-actions" style="display: flex; gap: 0.5rem;">
        <button class="btn-view-cart" style="
          flex: 1;
          background: rgba(0, 122, 255, 0.1);
          color: #007aff;
          border: none;
          padding: 0.5rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">View Cart</button>
        <button class="btn-quick-order" style="
          flex: 1;
          background: linear-gradient(135deg, #007aff, #0066ff);
          color: white;
          border: none;
          padding: 0.5rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
        ">Quick Order</button>
      </div>
    `;

    document.body.appendChild(cartPreview);

    // Add event listeners
    cartPreview.querySelector('.btn-view-cart').addEventListener('click', () => {
      this.showFullCart();
    });

    cartPreview.querySelector('.btn-quick-order').addEventListener('click', () => {
      this.quickOrder();
    });

    // Override existing cart functions to update preview
    this.enhanceCartFunctions();
  }

  enhanceCartFunctions() {
    // Override updateCartDisplay to also update preview
    const originalUpdateCartDisplay = window.updateCartDisplay;
    if (originalUpdateCartDisplay) {
      window.updateCartDisplay = () => {
        originalUpdateCartDisplay();
        this.updateCartPreview();
      };
    }

    // Override addToCart to show preview
    const originalAddToCart = window.addToCart;
    if (originalAddToCart) {
      window.addToCart = () => {
        originalAddToCart();
        this.showCartPreview();
        this.showNotification('Item added to cart! 🛒', 'success');
      };
    }
  }

  updateCartPreview() {
    const cartPreview = document.getElementById('cartPreview');
    if (!cartPreview || !window.shoppingCart) return;

    const cart = window.shoppingCart;
    const countEl = cartPreview.querySelector('.cart-preview-count');
    const itemsEl = cartPreview.querySelector('.cart-preview-items');
    const totalEl = cartPreview.querySelector('.cart-preview-total');

    // Update count
    countEl.textContent = cart.length;

    // Update items
    itemsEl.innerHTML = '';
    cart.slice(0, 3).forEach(item => { // Show max 3 items
      const itemEl = document.createElement('div');
      itemEl.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.25rem 0;
        font-size: 0.8rem;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      `;
      itemEl.innerHTML = `
        <span style="color: #333;">${item.package} v${item.count}</span>
        <span style="color: #0066ff; font-weight: 600;">Rs.${item.totalPrice.toFixed(2)}</span>
      `;
      itemsEl.appendChild(itemEl);
    });

    if (cart.length > 3) {
      const moreEl = document.createElement('div');
      moreEl.style.cssText = 'text-align: center; color: #666; font-size: 0.7rem; padding: 0.25rem 0;';
      moreEl.textContent = `+${cart.length - 3} more items`;
      itemsEl.appendChild(moreEl);
    }

    // Update total
    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    totalEl.textContent = `Total: Rs.${total.toFixed(2)}`;

    // Show/hide preview based on cart contents
    if (cart.length > 0) {
      this.showCartPreview();
    } else {
      this.hideCartPreview();
    }
  }

  showCartPreview() {
    const cartPreview = document.getElementById('cartPreview');
    if (!cartPreview) return;

    cartPreview.style.display = 'block';
    setTimeout(() => {
      cartPreview.style.transform = 'translateY(0)';
      cartPreview.style.opacity = '1';
    }, 10);

    this.cartPreviewVisible = true;
  }

  hideCartPreview() {
    const cartPreview = document.getElementById('cartPreview');
    if (!cartPreview) return;

    cartPreview.style.transform = 'translateY(100px)';
    cartPreview.style.opacity = '0';
    
    setTimeout(() => {
      cartPreview.style.display = 'none';
    }, 300);

    this.cartPreviewVisible = false;
  }

  showFullCart() {
    const cartContainer = document.getElementById('cartContainer');
    if (cartContainer) {
      cartContainer.scrollIntoView({ behavior: 'smooth' });
    }
  }

  quickOrder() {
    if (window.makeBulkOrder) {
      window.makeBulkOrder();
    }
  }

  addPurchaseHelpers() {
    // Add price calculation helper
    this.addPriceCalculationHelper();
    
    // Add package comparison helper
    this.addPackageComparisonHelper();
  }

  addPriceCalculationHelper() {
    const priceBox = document.getElementById('checkout');
    if (!priceBox) return;

    // Add price breakdown on hover
    priceBox.addEventListener('mouseenter', () => {
      this.showPriceBreakdown();
    });

    priceBox.addEventListener('mouseleave', () => {
      this.hidePriceBreakdown();
    });
  }

  showPriceBreakdown() {
    const pkg = document.getElementById('package')?.value;
    const count = parseInt(document.getElementById('videos')?.value);
    
    if (!pkg || !count || !window.prices) return;

    const pricePerVideo = window.prices[pkg] || 1;
    const total = pricePerVideo * count;

    const breakdown = document.createElement('div');
    breakdown.id = 'priceBreakdown';
    breakdown.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid rgba(0, 102, 255, 0.2);
      border-radius: 8px;
      padding: 0.75rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      font-size: 0.8rem;
      margin-top: 0.5rem;
    `;

    breakdown.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 0.5rem; color: #0066ff;">Price Breakdown:</div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span>Package:</span>
        <span>${pkg}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span>Videos:</span>
        <span>${count}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
        <span>Price per video:</span>
        <span>Rs.${pricePerVideo}</span>
      </div>
      <hr style="margin: 0.5rem 0; border: none; border-top: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; font-weight: 600; color: #0066ff;">
        <span>Total:</span>
        <span>Rs.${total.toFixed(2)}</span>
      </div>
    `;

    const priceBox = document.getElementById('checkout');
    priceBox.style.position = 'relative';
    priceBox.appendChild(breakdown);
  }

  hidePriceBreakdown() {
    const breakdown = document.getElementById('priceBreakdown');
    if (breakdown) {
      breakdown.remove();
    }
  }

  addPackageComparisonHelper() {
    const packageSelect = document.getElementById('package');
    if (!packageSelect) return;

    // Add comparison tooltip
    const comparisonBtn = document.createElement('button');
    comparisonBtn.textContent = '📊 Compare Packages';
    comparisonBtn.style.cssText = `
      background: rgba(0, 122, 255, 0.1);
      color: #007aff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 0.5rem;
      transition: all 0.2s ease;
    `;

    comparisonBtn.addEventListener('click', () => {
      this.showPackageComparison();
    });

    packageSelect.parentNode.appendChild(comparisonBtn);
  }

  showPackageComparison() {
    if (!window.prices) return;

    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      max-width: 500px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    let comparisonHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="margin: 0; color: #0066ff;">Package Comparison</h3>
        <button class="close-comparison" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
      </div>
      <div style="display: grid; gap: 0.75rem;">
    `;

    Object.entries(window.prices).forEach(([pkg, price]) => {
      const limit = window.limits?.[pkg] || { max: 'N/A' };
      comparisonHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: rgba(0, 102, 255, 0.05); border-radius: 8px;">
          <div>
            <div style="font-weight: 600; color: #0066ff;">${pkg}</div>
            <div style="font-size: 0.8rem; color: #666;">Max: ${limit.max} videos</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600; color: #0066ff;">Rs.${price}</div>
            <div style="font-size: 0.8rem; color: #666;">per video</div>
          </div>
        </div>
      `;
    });

    comparisonHTML += '</div>';
    content.innerHTML = comparisonHTML;

    content.querySelector('.close-comparison').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl + Enter to add to cart
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (window.addToCart) {
          window.addToCart();
        }
      }

      // Ctrl + Shift + Enter for quick order
      if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        if (window.makeOrder) {
          window.makeOrder();
        }
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        document.querySelectorAll('[style*="position: fixed"]').forEach(modal => {
          if (modal.style.zIndex >= 10000) {
            modal.remove();
          }
        });
      }
    });
  }

  showNotification(message, type = 'info') {
    if (window.showEnhancedNotification) {
      window.showEnhancedNotification(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }
}

// Auto-initialize on buy page
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('buy')) {
    new EnhancedPurchaseFlow();
  }
});

// Export for manual control
window.EnhancedPurchaseFlow = EnhancedPurchaseFlow;