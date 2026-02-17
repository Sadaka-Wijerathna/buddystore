// Loading States Manager
class LoadingStates {
  static showSkeleton(containerId, type = 'list') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const skeletons = {
      list: `
        <div class="skeleton-item">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-content">
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>
        </div>
      `.repeat(5),
      
      card: `
        <div class="skeleton-card">
          <div class="skeleton-header"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      `.repeat(3),
      
      table: `
        <div class="skeleton-table">
          <div class="skeleton-row">
            <div class="skeleton-cell"></div>
            <div class="skeleton-cell"></div>
            <div class="skeleton-cell"></div>
          </div>
        </div>
      `.repeat(5)
    };

    container.innerHTML = `<div class="skeleton-container">${skeletons[type] || skeletons.list}</div>`;
  }

  static showSpinner(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
  }

  static showProgress(containerId, current, total, message = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const percentage = Math.round((current / total) * 100);

    container.innerHTML = `
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <p class="progress-text">${message} ${current}/${total} (${percentage}%)</p>
      </div>
    `;
  }

  static hide(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
  }
}

// Add CSS for loading states
const style = document.createElement('style');
style.textContent = `
  .skeleton-container {
    padding: 1rem;
  }

  .skeleton-item {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    margin-bottom: 0.5rem;
    background: white;
    border-radius: 8px;
  }

  .skeleton-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
  }

  .skeleton-content {
    flex: 1;
  }

  .skeleton-line {
    height: 16px;
    margin-bottom: 8px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
    border-radius: 4px;
  }

  .skeleton-line.short {
    width: 60%;
  }

  .skeleton-card {
    padding: 1.5rem;
    margin-bottom: 1rem;
    background: white;
    border-radius: 12px;
  }

  .skeleton-header {
    height: 24px;
    width: 40%;
    margin-bottom: 1rem;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
    border-radius: 4px;
  }

  .skeleton-table {
    background: white;
    border-radius: 8px;
    padding: 1rem;
  }

  .skeleton-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .skeleton-cell {
    flex: 1;
    height: 20px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
    border-radius: 4px;
  }

  @keyframes skeleton-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .loading-spinner {
    text-align: center;
    padding: 3rem;
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #f3f4f6;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .progress-container {
    padding: 2rem;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    transition: width 0.3s ease;
  }

  .progress-text {
    text-align: center;
    color: #64748b;
    font-size: 14px;
  }
`;
document.head.appendChild(style);

window.LoadingStates = LoadingStates;
