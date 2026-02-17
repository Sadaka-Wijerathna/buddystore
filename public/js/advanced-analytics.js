// ==================== ADVANCED ANALYTICS WITH CHART.JS ====================

let currentAnalyticsPeriod = 'all';
let analyticsData = null;
let chartInstances = {}; // Store chart instances for updates

// Chart.js default configuration
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#64748b';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.padding = 15;

// Color palette for charts
const chartColors = {
  primary: '#007aff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
  orange: '#f97316',
  cyan: '#06b6d4'
};

const chartGradients = {
  blue: ['rgba(0, 122, 255, 0.8)', 'rgba(0, 122, 255, 0.2)'],
  green: ['rgba(16, 185, 129, 0.8)', 'rgba(16, 185, 129, 0.2)'],
  purple: ['rgba(139, 92, 246, 0.8)', 'rgba(139, 92, 246, 0.2)'],
  orange: ['rgba(245, 158, 11, 0.8)', 'rgba(245, 158, 11, 0.2)'],
  pink: ['rgba(236, 72, 153, 0.8)', 'rgba(236, 72, 153, 0.2)']
};

// Load analytics data
async function loadAnalytics() {
  console.log('📊 Loading analytics for period:', currentAnalyticsPeriod);
  await fetchAnalyticsData(currentAnalyticsPeriod);
}

// Set analytics time filter
function setAnalyticsTimeFilter(period) {
  currentAnalyticsPeriod = period;
  
  // Update button states
  document.querySelectorAll('.time-filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.period === period) {
      btn.classList.add('active');
    }
  });
  
  // Reload analytics data
  fetchAnalyticsData(period);
}

// Show custom range modal
function showCustomRangeModal() {
  showNotification('Custom range feature coming soon!', 'info');
}

// Export analytics data
function exportAnalyticsData() {
  if (!analyticsData) {
    showNotification('No analytics data to export', 'warning');
    return;
  }
  
  try {
    // Create CSV content
    let csv = 'Analytics Report\n';
    csv += `Period: ${currentAnalyticsPeriod}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    csv += 'Key Metrics\n';
    csv += `Total Revenue,Rs ${analyticsData.totalRevenue.toFixed(2)}\n`;
    csv += `Total Orders,${analyticsData.totalOrders}\n`;
    csv += `Active Users,${analyticsData.activeUsers}\n`;
    csv += `Average Order Value,Rs ${analyticsData.avgOrderValue.toFixed(2)}\n\n`;
    
    csv += 'Top Customers\n';
    csv += 'Rank,Username,Total Orders,Total Spent,Avg Order Value\n';
    analyticsData.topCustomers.forEach((customer, index) => {
      csv += `${index + 1},@${customer.username},${customer.totalOrders},Rs ${customer.totalSpent.toFixed(2)},Rs ${customer.avgOrderValue.toFixed(2)}\n`;
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${currentAnalyticsPeriod}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification('Analytics data exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting analytics:', error);
    showNotification('Failed to export analytics data', 'error');
  }
}

// Fetch analytics data from API
async function fetchAnalyticsData(period) {
  try {
    // Show loading state
    document.getElementById('analyticsRevenue').textContent = 'Loading...';
    document.getElementById('analyticsOrders').textContent = 'Loading...';
    document.getElementById('analyticsUsers').textContent = 'Loading...';
    document.getElementById('analyticsAvgOrder').textContent = 'Loading...';
    document.getElementById('analyticsTotalVideos').textContent = 'Loading...';
    document.getElementById('analyticsConversionRate').textContent = 'Loading...';
    
    // Fetch all users to calculate analytics
    const usersResponse = await fetch('/api/users');
    if (!usersResponse.ok) throw new Error('Failed to fetch users');
    const users = await usersResponse.json();
    
    // Calculate analytics based on period
    const analytics = calculateAnalytics(users, period);
    analyticsData = analytics;
    
    console.log('✅ Analytics loaded:', period, '- Orders:', analytics.totalOrders, 'Revenue:', analytics.totalRevenue);
    
    // Update UI
    updateAnalyticsUI(analytics);
    updateAllCharts(analytics);
    updateTopCustomersTable(analytics.topCustomers);
    
  } catch (error) {
    console.error('❌ Error loading analytics:', error);
    showNotification('Failed to load analytics data', 'error');
    
    // Show error state
    document.getElementById('analyticsRevenue').textContent = 'Error';
    document.getElementById('analyticsOrders').textContent = 'Error';
    document.getElementById('analyticsUsers').textContent = 'Error';
    document.getElementById('analyticsAvgOrder').textContent = 'Error';
    document.getElementById('analyticsTotalVideos').textContent = 'Error';
    document.getElementById('analyticsConversionRate').textContent = 'Error';
  }
}

// Calculate analytics from user data
function calculateAnalytics(users, period) {
  const now = new Date();
  const periodStart = getPeriodStartDate(period, now);
  
  console.log('📊 Period Start Date:', periodStart.toISOString());
  console.log('📊 Current Date:', now.toISOString());
  
  let totalRevenue = 0;
  let totalOrders = 0;
  let totalVideos = 0;
  let activeUsers = new Set();
  let packageDistribution = {};
  let packageRevenue = {};
  let customerStats = {};
  let dailyRevenue = {};
  let dailyOrders = {};
  let dailyUsers = {};
  let orderValues = [];
  let processedCount = 0;
  let skippedCount = 0;
  
  users.forEach(user => {
    if (!user.purchases || user.purchases.length === 0) return;
    
    let userRevenue = 0;
    let userOrders = 0;
    
    user.purchases.forEach(purchase => {
      // Parse date - handle various date formats
      let purchaseDate;
      if (purchase.date) {
        purchaseDate = new Date(purchase.date);
      } else if (purchase.addedAt) {
        purchaseDate = new Date(purchase.addedAt);
      } else {
        purchaseDate = new Date();
      }
      
      // Validate date
      if (isNaN(purchaseDate.getTime())) {
        console.warn('Invalid date for purchase:', purchase);
        purchaseDate = new Date();
      }
      
      // Check if purchase is in period
      if (period !== 'all' && purchaseDate < periodStart) {
        skippedCount++;
        return;
      }
      
      processedCount++;
      
      // Parse price
      let price = 0;
      if (typeof purchase.price === 'string') {
        price = parseFloat(purchase.price.replace(/[^0-9.]/g, '')) || 0;
      } else if (typeof purchase.price === 'number') {
        price = purchase.price;
      }
      
      // Parse video count
      let videoCount = parseInt(purchase.count) || 0;
      
      totalRevenue += price;
      totalOrders++;
      totalVideos += videoCount;
      userRevenue += price;
      userOrders++;
      activeUsers.add(user.username);
      orderValues.push(price);
      
      // Package distribution - normalize package names (remove version numbers)
      let packageName = purchase.package || 'Unknown';
      packageName = packageName.replace(/\s+v\d+/gi, '').trim();
      packageDistribution[packageName] = (packageDistribution[packageName] || 0) + 1;
      packageRevenue[packageName] = (packageRevenue[packageName] || 0) + price;
      
      // Daily metrics for charts
      const dateKey = purchaseDate.toISOString().split('T')[0];
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + price;
      dailyOrders[dateKey] = (dailyOrders[dateKey] || 0) + 1;
      dailyUsers[dateKey] = dailyUsers[dateKey] || new Set();
      dailyUsers[dateKey].add(user.username);
    });
    
    // Customer stats
    if (userOrders > 0) {
      customerStats[user.username] = {
        username: user.username,
        totalOrders: userOrders,
        totalSpent: userRevenue,
        avgOrderValue: userRevenue / userOrders,
        lastPurchase: user.purchases[user.purchases.length - 1]?.date || 'N/A'
      };
    }
  });
  
  // Calculate metrics
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const conversionRate = users.length > 0 ? (activeUsers.size / users.length) * 100 : 0;
  
  // Get top customers
  const topCustomers = Object.values(customerStats)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);
  
  // Convert daily users Set to count
  const dailyUserCounts = {};
  Object.keys(dailyUsers).forEach(date => {
    dailyUserCounts[date] = dailyUsers[date].size;
  });
  
  console.log('📊 Processed:', processedCount, 'purchases, Skipped:', skippedCount, 'purchases');
  console.log('📊 Total Revenue:', totalRevenue, 'Total Orders:', totalOrders);
  
  return {
    totalRevenue,
    totalOrders,
    totalVideos,
    activeUsers: activeUsers.size,
    avgOrderValue,
    conversionRate,
    packageDistribution,
    packageRevenue,
    topCustomers,
    dailyRevenue,
    dailyOrders,
    dailyUsers: dailyUserCounts,
    orderValues,
    period
  };
}

// Get period start date
function getPeriodStartDate(period, now) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  switch(period) {
    case 'today':
      return start;
    case 'week':
      start.setDate(start.getDate() - 7);
      return start;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      return start;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      return start;
    case 'all':
      return new Date(0); // Beginning of time
    default:
      return start;
  }
}

// Update analytics UI
function updateAnalyticsUI(analytics) {
  // Update metrics
  document.getElementById('analyticsRevenue').textContent = 
    `Rs ${analytics.totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById('analyticsOrders').textContent = analytics.totalOrders.toLocaleString();
  document.getElementById('analyticsUsers').textContent = analytics.activeUsers.toLocaleString();
  document.getElementById('analyticsAvgOrder').textContent = 
    `Rs ${analytics.avgOrderValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  document.getElementById('analyticsTotalVideos').textContent = analytics.totalVideos.toLocaleString();
  document.getElementById('analyticsConversionRate').textContent = 
    `${analytics.conversionRate.toFixed(1)}%`;
  
  // Update change indicators (simplified - showing as neutral for now)
  updateChangeIndicator('analyticsRevenueChange', 0);
  updateChangeIndicator('analyticsOrdersChange', 0);
  updateChangeIndicator('analyticsUsersChange', 0);
  updateChangeIndicator('analyticsAvgOrderChange', 0);
}

// Update change indicator
function updateChangeIndicator(elementId, percentChange) {
  const element = document.getElementById(elementId);
  const icon = document.getElementById(elementId + 'Icon');
  const text = document.getElementById(elementId + 'Text');
  
  if (!element || !icon || !text) return;
  
  if (percentChange > 0) {
    element.style.color = '#10b981';
    icon.textContent = '📈';
    text.textContent = `+${percentChange.toFixed(1)}% from last period`;
  } else if (percentChange < 0) {
    element.style.color = '#ef4444';
    icon.textContent = '📉';
    text.textContent = `${percentChange.toFixed(1)}% from last period`;
  } else {
    element.style.color = '#64748b';
    icon.textContent = '➖';
    text.textContent = '+0% from last period';
  }
}

// Update all charts
function updateAllCharts(analytics) {
  createRevenueChart(analytics);
  createPackageChart(analytics);
  createUserActivityChart(analytics);
  createRevenueByPackageChart(analytics);
  createTopCustomersChart(analytics);
  createOrderValueDistributionChart(analytics);
}

// Create gradient for charts
function createGradient(ctx, color1, color2) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  return gradient;
}

// Revenue Chart (Line/Bar/Area)
function createRevenueChart(analytics) {
  const canvas = document.getElementById('revenueChartCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart
  if (chartInstances.revenueChart) {
    chartInstances.revenueChart.destroy();
  }
  
  // Prepare data
  const dates = Object.keys(analytics.dailyRevenue).sort();
  const revenues = dates.map(date => analytics.dailyRevenue[date]);
  
  if (dates.length === 0) {
    canvas.parentElement.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;">No revenue data for this period</div>';
    return;
  }
  
  const chartType = document.getElementById('revenueChartType')?.value || 'line';
  
  const config = {
    type: chartType === 'area' ? 'line' : chartType,
    data: {
      labels: dates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Revenue (Rs)',
        data: revenues,
        backgroundColor: chartType === 'area' || chartType === 'line' ? 
          createGradient(ctx, ...chartGradients.blue) : chartColors.primary,
        borderColor: chartColors.primary,
        borderWidth: 3,
        fill: chartType === 'area',
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: chartColors.primary,
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            label: function(context) {
              return `Revenue: Rs ${context.parsed.y.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'Rs ' + value.toLocaleString();
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  };
  
  chartInstances.revenueChart = new Chart(ctx, config);
}

// Update revenue chart type
function updateRevenueChartType() {
  if (analyticsData) {
    createRevenueChart(analyticsData);
  }
}

// Package Distribution Chart (Doughnut/Pie/Polar)
function createPackageChart(analytics) {
  const canvas = document.getElementById('packageChartCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart
  if (chartInstances.packageChart) {
    chartInstances.packageChart.destroy();
  }
  
  const packages = Object.entries(analytics.packageDistribution)
    .sort((a, b) => b[1] - a[1]);
  
  if (packages.length === 0) {
    canvas.parentElement.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;">No package data for this period</div>';
    return;
  }
  
  const chartType = document.getElementById('packageChartType')?.value || 'doughnut';
  
  const colors = [
    chartColors.primary,
    chartColors.success,
    chartColors.warning,
    chartColors.danger,
    chartColors.purple,
    chartColors.pink,
    chartColors.indigo,
    chartColors.teal,
    chartColors.orange,
    chartColors.cyan
  ];
  
  const config = {
    type: chartType,
    data: {
      labels: packages.map(([name]) => name),
      datasets: [{
        data: packages.map(([, count]) => count),
        backgroundColor: colors.slice(0, packages.length),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 15,
            font: { size: 12 },
            generateLabels: function(chart) {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  const percentage = ((value / total) * 100).toFixed(1);
                  return {
                    text: `${label}: ${value} (${percentage}%)`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} orders (${percentage}%)`;
            }
          }
        }
      }
    }
  };
  
  chartInstances.packageChart = new Chart(ctx, config);
}

// Update package chart type
function updatePackageChartType() {
  if (analyticsData) {
    createPackageChart(analyticsData);
  }
}

// User Activity Chart (Bar chart showing daily active users)
function createUserActivityChart(analytics) {
  const canvas = document.getElementById('userActivityChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart
  if (chartInstances.userActivityChart) {
    chartInstances.userActivityChart.destroy();
  }
  
  const dates = Object.keys(analytics.dailyUsers).sort();
  const userCounts = dates.map(date => analytics.dailyUsers[date]);
  
  if (dates.length === 0) {
    canvas.parentElement.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;">No user activity data for this period</div>';
    return;
  }
  
  const config = {
    type: 'bar',
    data: {
      labels: dates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Active Users',
        data: userCounts,
        backgroundColor: createGradient(ctx, ...chartGradients.purple),
        borderColor: chartColors.purple,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  };
  
  chartInstances.userActivityChart = new Chart(ctx, config);
}

// Revenue by Package Chart (Horizontal Bar)
function createRevenueByPackageChart(analytics) {
  const canvas = document.getElementById('revenueByPackageChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart
  if (chartInstances.revenueByPackageChart) {
    chartInstances.revenueByPackageChart.destroy();
  }
  
  const packages = Object.entries(analytics.packageRevenue)
    .sort((a, b) => b[1] - a[1]);
  
  if (packages.length === 0) {
    canvas.parentElement.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;">No revenue data for this period</div>';
    return;
  }
  
  const colors = [
    chartColors.primary,
    chartColors.success,
    chartColors.warning,
    chartColors.danger,
    chartColors.purple,
    chartColors.pink
  ];
  
  const config = {
    type: 'bar',
    data: {
      labels: packages.map(([name]) => name),
      datasets: [{
        label: 'Revenue (Rs)',
        data: packages.map(([, revenue]) => revenue),
        backgroundColor: colors.slice(0, packages.length),
        borderWidth: 0,
        borderRadius: 8
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          callbacks: {
            label: function(context) {
              return `Revenue: Rs ${context.parsed.x.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'Rs ' + value.toLocaleString();
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        y: {
          grid: {
            display: false
          }
        }
      }
    }
  };
  
  chartInstances.revenueByPackageChart = new Chart(ctx, config);
}

// Top Customers Chart (Horizontal Bar)
function createTopCustomersChart(analytics) {
  const canvas = document.getElementById('topCustomersChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart
  if (chartInstances.topCustomersChart) {
    chartInstances.topCustomersChart.destroy();
  }
  
  if (analytics.topCustomers.length === 0) {
    canvas.parentElement.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;">No customer data for this period</div>';
    return;
  }
  
  const config = {
    type: 'bar',
    data: {
      labels: analytics.topCustomers.map(c => '@' + c.username),
      datasets: [{
        label: 'Total Spent (Rs)',
        data: analytics.topCustomers.map(c => c.totalSpent),
        backgroundColor: createGradient(ctx, ...chartGradients.green),
        borderColor: chartColors.success,
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          callbacks: {
            label: function(context) {
              const customer = analytics.topCustomers[context.dataIndex];
              return [
                `Total Spent: Rs ${customer.totalSpent.toFixed(2)}`,
                `Orders: ${customer.totalOrders}`,
                `Avg Order: Rs ${customer.avgOrderValue.toFixed(2)}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'Rs ' + value.toLocaleString();
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        y: {
          grid: {
            display: false
          }
        }
      }
    }
  };
  
  chartInstances.topCustomersChart = new Chart(ctx, config);
}

// Order Value Distribution Chart (Histogram)
function createOrderValueDistributionChart(analytics) {
  const canvas = document.getElementById('orderValueDistributionChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destroy existing chart
  if (chartInstances.orderValueDistributionChart) {
    chartInstances.orderValueDistributionChart.destroy();
  }
  
  if (analytics.orderValues.length === 0) {
    canvas.parentElement.innerHTML = '<div style="text-align: center; padding: 3rem; color: #64748b;">No order data for this period</div>';
    return;
  }
  
  // Create bins for histogram
  const maxValue = Math.max(...analytics.orderValues);
  const binSize = Math.ceil(maxValue / 10);
  const bins = {};
  
  analytics.orderValues.forEach(value => {
    const bin = Math.floor(value / binSize) * binSize;
    bins[bin] = (bins[bin] || 0) + 1;
  });
  
  const sortedBins = Object.keys(bins).sort((a, b) => parseInt(a) - parseInt(b));
  
  const config = {
    type: 'bar',
    data: {
      labels: sortedBins.map(bin => `Rs ${parseInt(bin)}-${parseInt(bin) + binSize}`),
      datasets: [{
        label: 'Number of Orders',
        data: sortedBins.map(bin => bins[bin]),
        backgroundColor: createGradient(ctx, ...chartGradients.orange),
        borderColor: chartColors.warning,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          callbacks: {
            label: function(context) {
              return `Orders: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  };
  
  chartInstances.orderValueDistributionChart = new Chart(ctx, config);
}

// Update top customers table
function updateTopCustomersTable(topCustomers) {
  const tbody = document.getElementById('topCustomersTableBody');
  if (!tbody) return;
  
  if (topCustomers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding: 3rem; text-align: center; color: #64748b;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
          <div>No customer data for this period</div>
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  topCustomers.forEach((customer, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    const rowStyle = index % 2 === 0 ? 'background: rgba(255, 255, 255, 0.5);' : 'background: rgba(248, 250, 252, 0.5);';
    
    html += `
      <tr style="${rowStyle} border-bottom: 1px solid #e2e8f0; transition: background 0.2s;" onmouseover="this.style.background='rgba(0, 102, 255, 0.05)'" onmouseout="this.style.background='${index % 2 === 0 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(248, 250, 252, 0.5)'}'">
        <td style="padding: 1rem; font-weight: 600; color: #0f172a;">${medal} ${index + 1}</td>
        <td style="padding: 1rem; color: #0f172a; font-weight: 500;">@${customer.username}</td>
        <td style="padding: 1rem; text-align: center; color: #64748b;">${customer.totalOrders}</td>
        <td style="padding: 1rem; text-align: right; color: #10b981; font-weight: 600;">Rs ${customer.totalSpent.toFixed(2)}</td>
        <td style="padding: 1rem; text-align: right; color: #64748b;">Rs ${customer.avgOrderValue.toFixed(2)}</td>
        <td style="padding: 1rem; text-align: center; color: #64748b; font-size: 0.875rem;">${customer.lastPurchase}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

// Initialize analytics when tab is switched
function initializeAnalytics() {
  if (currentTab === 'analytics' && !analyticsData) {
    loadAnalytics();
  }
}

console.log('✅ Advanced Analytics module loaded');
