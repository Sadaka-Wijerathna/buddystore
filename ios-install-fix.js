// Add this code to admin.html to fix iOS install button

// Replace the installBtn.addEventListener('click', async () => { section with this:

installBtn.addEventListener('click', async () => {
  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // iOS: Show manual installation instructions
  if (isIOS) {
    const instructions = `
      <div style="text-align: left; line-height: 1.8;">
        <h3 style="margin-top: 0; color: #0066ff;">📱 Install on iOS</h3>
        <p><strong>Follow these steps:</strong></p>
        <ol style="padding-left: 1.5rem;">
          <li>Tap the <strong>Share</strong> button <span style="font-size: 20px;">⬆️</span> (at the bottom of Safari)</li>
          <li>Scroll down and tap <strong>"Add to Home Screen"</strong> <span style="font-size: 20px;">➕</span></li>
          <li>Tap <strong>"Add"</strong> in the top right corner</li>
        </ol>
        <p style="margin-top: 1rem; padding: 0.75rem; background: rgba(0, 102, 255, 0.1); border-radius: 8px; font-size: 13px;">
          💡 <strong>Tip:</strong> The app icon will appear on your home screen with the name "Admin Panel"
        </p>
      </div>
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 2rem;
      border-radius: 16px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    `;
    content.innerHTML = instructions + `
      <button onclick="this.closest('div[style*=fixed]').remove()" 
              style="width: 100%; padding: 1rem; margin-top: 1rem; background: #0066ff; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer;">
        Got it!
      </button>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    return;
  }
  
  // Android/Desktop: Use standard install prompt
  if (!deferredPrompt) {
    showNotification('Install not available. Try on HTTPS or localhost.', 'warning');
    return;
  }
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    showNotification('App installed successfully!', 'success');
    installBtn.textContent = '✅ Installed';
    installBtn.style.opacity = '0.6';
    installBtn.disabled = true;
  } else {
    showNotification('Installation cancelled', 'info');
  }
  
  deferredPrompt = null;
});
