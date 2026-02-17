/* Twemoji Loader - Modern Emoji Replacement */
(function() {
  'use strict';

  function loadTwemoji() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js';
    script.crossOrigin = 'anonymous';
    
    script.onload = function() {
      if (typeof twemoji !== 'undefined') {
        // Parse immediately
        setTimeout(() => {
          twemoji.parse(document.body, {
            folder: 'svg',
            ext: '.svg'
          });
        }, 100);

        // Watch for new content
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
              if (node.nodeType === 1 && node.textContent) {
                twemoji.parse(node, {
                  folder: 'svg',
                  ext: '.svg'
                });
              }
            });
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    };

    document.head.appendChild(script);
  }

  // Load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTwemoji);
  } else {
    loadTwemoji();
  }
})();
