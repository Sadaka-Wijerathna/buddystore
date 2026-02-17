/* ========================================
   INTERACTIVE DASHBOARD CHARTS
   Beautiful data visualization with Chart.js
   ======================================== */

// Chart.js Configuration
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#666';
Chart.defaults.plugins.legend.display = true;
Chart.defaults.plugins.legend.position = 'bottom';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.borderRadius = 8;
Chart.defaults.plugins.tooltip.titleFont = { size: 14, weight: 'bold' };
Chart.defaults.plugins.tooltip.bodyFont = { size: 13 };

// Gradient colors
const gradientColors = {
  primary: ['#667eea', '#764ba2'],
  secondary: ['#f093fb', '#f5576c'],
  success: ['#4facfe', '#00f2fe'],
  warning: ['#fa709a', '#fee140'],
  info: ['#a8edea', '#fed6e3']
};

// Create gradient helper
function createGradient(ctx, colors, direction = 'vertical') {
  const gradient = direction === 'vertical' 
    ? ctx.createLinearGradient(0, 0, 0, 400)
    : ctx.createLinearGradient(0, 0, 400, 0);
  
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  return gradient;
}

// ===== SPENDING TREND CHART =====
function createSpendingChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  const gradient = createGradient(ctx.getContext('2d'), gradientColors.primary);
  const gradientFill = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
  gradientFill.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
  gradientFill.addColorStop(1, 'rgba(102, 126, 234, 0.0)');
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Spending (Rs)',
        data: data.values || [500, 800, 600, 1200, 900, 1500],
        borderColor: gradient,
        backgroundColor: gradientFill,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#fff',
        pointBorderColor: gradient,
        pointBorderWidth: 3,
        pointHoverBackgroundColor: '#667eea',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'Rs ' + context.parsed.y.toLocaleString();
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          },
          ticks: {
            callback: function(value) {
              return 'Rs ' + value;
            }
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          }
        }
      },
      animation: {
        duration: 2000,
        easing: 'easeInOutQuart'
      }
    }
  });
}

// ===== PACKAGE DISTRIBUTION CHART =====
function createPackageChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels || ['Mixed', 'Mom And Son', 'CCTV', 'SL Leaks', 'Rape'],
      datasets: [{
        data: data.values || [30, 25, 20, 15, 10],
        backgroundColor: [
          '#667eea',
          '#ee5a6f',
          '#f093fb',
          '#4facfe',
          '#feca57',
          '#1dd1a1',
          '#ff6b6b',
          '#54a0ff'
        ],
        borderWidth: 0,
        hoverOffset: 15
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
            font: {
              size: 12,
              weight: '500'
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 2000,
        easing: 'easeInOutQuart'
      }
    }
  });
}

// ===== CATEGORY COMPARISON CHART =====
function createCategoryChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.labels || ['Mixed', 'Mom And Son', 'CCTV', 'SL Leaks', 'Rape'],
      datasets: [{
        label: 'Videos',
        data: data.videos || [100, 80, 60, 50, 40],
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderRadius: 8,
        borderSkipped: false
      }, {
        label: 'Spending (Rs)',
        data: data.spending || [500, 400, 300, 250, 200],
        backgroundColor: 'rgba(118, 75, 162, 0.8)',
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (label.includes('Spending')) {
                return `${label}: Rs ${value}`;
              }
              return `${label}: ${value}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          }
        }
      },
      animation: {
        duration: 2000,
        easing: 'easeInOutQuart'
      }
    }
  });
}

// ===== ACTIVITY TIMELINE CHART =====
function createActivityChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  const gradient = createGradient(ctx.getContext('2d'), gradientColors.success);
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Activity',
        data: data.values || [3, 5, 2, 8, 4, 6, 7],
        borderColor: gradient,
        backgroundColor: 'rgba(79, 172, 254, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#4facfe',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            drawBorder: false
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          }
        }
      },
      animation: {
        duration: 2000,
        easing: 'easeInOutQuart'
      }
    }
  });
}

// ===== RADIAL PROGRESS CHART =====
function createRadialProgress(canvasId, percentage, label) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [percentage, 100 - percentage],
        backgroundColor: [
          '#667eea',
          'rgba(255, 255, 255, 0.1)'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '80%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      },
      animation: {
        animateRotate: true,
        duration: 2000,
        easing: 'easeInOutQuart'
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw: function(chart) {
        const width = chart.width;
        const height = chart.height;
        const ctx = chart.ctx;
        
        ctx.restore();
        const fontSize = (height / 114).toFixed(2);
        ctx.font = `bold ${fontSize}em Inter, sans-serif`;
        ctx.textBaseline = 'middle';
        
        const text = `${percentage}%`;
        const textX = Math.round((width - ctx.measureText(text).width) / 2);
        const textY = height / 2;
        
        ctx.fillStyle = '#333';
        ctx.fillText(text, textX, textY);
        
        if (label) {
          ctx.font = `${fontSize * 0.4}em Inter, sans-serif`;
          ctx.fillStyle = '#666';
          const labelX = Math.round((width - ctx.measureText(label).width) / 2);
          ctx.fillText(label, labelX, textY + 20);
        }
        
        ctx.save();
      }
    }]
  });
}

// ===== INITIALIZE CHARTS FROM DATA =====
function initializeDashboardCharts(userData) {
  const charts = {};
  
  // Process user data to extract chart data
  const chartData = processUserDataForCharts(userData);
  
  // Create spending trend chart
  if (document.getElementById('spendingChart')) {
    charts.spending = createSpendingChart('spendingChart', chartData.spending);
  }
  
  // Create package distribution chart
  if (document.getElementById('packageChart')) {
    charts.package = createPackageChart('packageChart', chartData.packages);
  }
  
  // Create category comparison chart
  if (document.getElementById('categoryChart')) {
    charts.category = createCategoryChart('categoryChart', chartData.categories);
  }
  
  // Create activity chart
  if (document.getElementById('activityChart')) {
    charts.activity = createActivityChart('activityChart', chartData.activity);
  }
  
  return charts;
}

// ===== PROCESS USER DATA FOR CHARTS =====
function processUserDataForCharts(packages) {
  if (!packages || packages.length === 0) {
    return {
      spending: { labels: [], values: [] },
      packages: { labels: [], values: [] },
      categories: { labels: [], videos: [], spending: [] },
      activity: { labels: [], values: [] }
    };
  }
  
  // Group by month for spending trend
  const monthlySpending = {};
  const categoryData = {};
  
  packages.forEach(pkg => {
    const date = new Date(pkg.date);
    const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const category = pkg.package.split(' ')[0];
    
    // Monthly spending
    if (!monthlySpending[monthKey]) {
      monthlySpending[monthKey] = 0;
    }
    if (pkg.price && pkg.price !== 'FREE') {
      const priceMatch = pkg.price.match(/[\d.]+/);
      monthlySpending[monthKey] += priceMatch ? parseFloat(priceMatch[0]) : 0;
    }
    
    // Category data
    if (!categoryData[category]) {
      categoryData[category] = { count: 0, videos: 0, spending: 0 };
    }
    categoryData[category].count++;
    categoryData[category].videos += pkg.count || 0;
    if (pkg.price && pkg.price !== 'FREE') {
      const priceMatch = pkg.price.match(/[\d.]+/);
      categoryData[category].spending += priceMatch ? parseFloat(priceMatch[0]) : 0;
    }
  });
  
  // Sort months chronologically
  const sortedMonths = Object.keys(monthlySpending).sort((a, b) => {
    return new Date(a) - new Date(b);
  });
  
  return {
    spending: {
      labels: sortedMonths.slice(-6), // Last 6 months
      values: sortedMonths.slice(-6).map(m => monthlySpending[m])
    },
    packages: {
      labels: Object.keys(categoryData),
      values: Object.keys(categoryData).map(c => categoryData[c].count)
    },
    categories: {
      labels: Object.keys(categoryData),
      videos: Object.keys(categoryData).map(c => categoryData[c].videos),
      spending: Object.keys(categoryData).map(c => categoryData[c].spending)
    },
    activity: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [0, 0, 0, 0, 0, 0, 0] // Would need actual activity data
    }
  };
}

// ===== UPDATE CHART DATA =====
function updateChartData(chart, newData) {
  if (!chart) return;
  
  chart.data.labels = newData.labels;
  chart.data.datasets[0].data = newData.values;
  chart.update('active');
}

// ===== DESTROY CHART =====
function destroyChart(chart) {
  if (chart) {
    chart.destroy();
  }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSpendingChart,
    createPackageChart,
    createCategoryChart,
    createActivityChart,
    createRadialProgress,
    initializeDashboardCharts,
    updateChartData,
    destroyChart
  };
}
