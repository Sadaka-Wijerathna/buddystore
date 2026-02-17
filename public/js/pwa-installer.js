/* PWA Installer - Service Worker Registration & Install Prompt */

(function() {
  'use strict';

  let deferredPrompt;

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('✅ Service Worker registered:', registration.scope);
        })
        .catch(error => {
          console.error('❌ Service Worker registration failed:', error);
        });
    });
  }

  // Create install button immediately (always visible for testing)
  window.addEventListener('load', () => {
    createInstallButton();
  });

  // Handle install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('💾 Install prompt available');
    e.preventDefault();
    deferredPrompt = e;
    updateInstallButton(true);
  });

  // Create install button
  function createInstallButton() {
    if (document.getElementById('pwa-install-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.innerHTML = '📱 Install App';
    btn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 25px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      z-index: 10000;
      transition: all 0.3s ease;
      font-family: 'Inter', sans-serif;
    `;
    
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    });
    
    btn.addEventListener('click', installApp);
    document.body.appendChild(btn);
  }

  // Update button state
  function updateInstallButton(canInstall) {
    const btn = document.getElementById('pwa-install-btn');
    if (!btn) return;

    if (canInstall) {
      btn.style.display = 'block';
      btn.innerHTML = '📱 Install App';
    } else {
      // Show instructions if can't install
      btn.innerHTML = '📱 PWA Ready';
    }
  }

  // Install app
  async function installApp() {
    if (!deferredPrompt) {
      // Show manual installation instructions
      showInstallInstructions();
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response: ${outcome}`);
    
    if (outcome === 'accepted') {
      console.log('✅ App installed');
      const btn = document.getElementById('pwa-install-btn');
      if (btn) btn.remove();
    }
    
    deferredPrompt = null;
  }

  // Show manual installation instructions
  function showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
      instructions = `
        <strong>Install on iOS:</strong><br>
        1. Tap the Share button (⬆️)<br>
        2. Scroll and tap "Add to Home Screen"<br>
        3. Tap "Add"
      `;
    } else if (isAndroid) {
      instructions = `
        <strong>Install on Android:</strong><br>
        1. Tap the menu (⋮)<br>
        2. Tap "Add to Home screen"<br>
        3. Tap "Add"
      `;
    } else {
      instructions = `
        <strong>Install on Desktop:</strong><br>
        1. Look for install icon (⊕) in address bar<br>
        2. Click "Install"<br>
        <br>
        Or use Chrome menu → "Install BuddyStore Admin"
      `;
    }

    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      padding: 20px;
    `;
    
    modal.innerHTML = `
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 16px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      ">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📱</div>
        <h3 style="margin-bottom: 1rem; color: #333;">Install as App</h3>
        <div style="text-align: left; color: #666; line-height: 1.6; margin-bottom: 1.5rem;">
          ${instructions}
        </div>
        <button onclick="this.closest('div').parentElement.remove()" style="
          background: #667eea;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        ">Got it!</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // App installed
  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA installed successfully');
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.remove();
  });

  // Check if running as PWA
  function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // Hide install button if already installed
  if (isPWA()) {
    console.log('✅ Running as PWA');
    setTimeout(() => {
      const btn = document.getElementById('pwa-install-btn');
      if (btn) btn.remove();
    }, 1000);
  } else {
    console.log('🌐 Running in browser - Install button available');
  }

})();
