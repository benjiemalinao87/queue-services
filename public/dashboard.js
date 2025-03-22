// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // Configuration
  let config = {
    refreshInterval: 60, // seconds
    maxWorkspaces: 10,
    darkMode: false
  };

  // Load saved settings if available
  const savedSettings = localStorage.getItem('dashboardSettings');
  if (savedSettings) {
    try {
      const parsedSettings = JSON.parse(savedSettings);
      config = { ...config, ...parsedSettings };
      
      // Apply saved settings to form
      document.getElementById('refreshInterval').value = config.refreshInterval;
      document.getElementById('maxWorkspaces').value = config.maxWorkspaces;
      document.getElementById('darkMode').checked = config.darkMode;
      
      // Apply dark mode if enabled
      if (config.darkMode) {
        document.body.classList.add('dark-mode');
      }
    } catch (e) {
      console.error('Error loading saved settings:', e);
    }
  }

  // Charts
  let exceedancesChart = null;
  let exceedancesByTypeChart = null;
  
  // Current workspace data
  let currentWorkspaceData = null;
  let currentWorkspaceId = null;
  
  // Auto-refresh timer
  let refreshTimer = null;

  // Initialize the dashboard
  initDashboard();

  // Event listeners
  document.getElementById('refreshBtn').addEventListener('click', fetchDashboardData);
  document.getElementById('resetAllBtn').addEventListener('click', resetAllMetrics);
  document.getElementById('workspaceSearchBtn').addEventListener('click', searchWorkspace);
  document.getElementById('settingsForm').addEventListener('submit', saveSettings);
  
  // Modal action buttons
  document.getElementById('resetSmsBtn').addEventListener('click', () => resetWorkspaceMetrics('sms'));
  document.getElementById('resetEmailBtn').addEventListener('click', () => resetWorkspaceMetrics('email'));
  document.getElementById('resetAllWorkspaceBtn').addEventListener('click', () => resetWorkspaceMetrics());
  
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      if (this.getAttribute('href').startsWith('#')) {
        e.preventDefault();
        
        // Hide all sections
        document.querySelectorAll('main > section').forEach(section => {
          section.style.display = 'none';
        });
        
        // Show the target section
        const targetId = this.getAttribute('href').substring(1);
        document.getElementById(targetId).style.display = 'block';
        
        // Update active link
        document.querySelectorAll('.nav-link').forEach(navLink => {
          navLink.classList.remove('active');
        });
        this.classList.add('active');
      }
    });
  });

  /**
   * Initialize the dashboard
   */
  function initDashboard() {
    // Show only the overview section initially
    document.querySelectorAll('main > section').forEach(section => {
      if (section.id !== 'overview') {
        section.style.display = 'none';
      }
    });
    
    // Initialize charts
    initCharts();
    
    // Fetch initial data
    fetchDashboardData();
    
    // Set up auto-refresh
    startAutoRefresh();
  }

  /**
   * Initialize charts
   */
  function initCharts() {
    // Exceedances over time chart
    const exceedancesCtx = document.getElementById('exceedancesChart').getContext('2d');
    exceedancesChart = new Chart(exceedancesCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'SMS',
            data: [],
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          },
          {
            label: 'Email',
            data: [],
            borderColor: 'rgba(153, 102, 255, 1)',
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Rate Limit Exceedances Over Time'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count'
            }
          }
        }
      }
    });
    
    // Exceedances by type chart
    const exceedancesByTypeCtx = document.getElementById('exceedancesByTypeChart').getContext('2d');
    exceedancesByTypeChart = new Chart(exceedancesByTypeCtx, {
      type: 'doughnut',
      data: {
        labels: ['SMS', 'Email'],
        datasets: [{
          data: [0, 0],
          backgroundColor: [
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Exceedances by Type'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  /**
   * Fetch dashboard data from the API
   */
  function fetchDashboardData() {
    // Show loading state
    document.querySelectorAll('.card-text').forEach(el => {
      el.classList.add('refreshing');
    });
    
    // Fetch metrics data
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    fetch(`${apiUrl}/metrics`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        updateDashboard(data);
        
        // Remove loading state
        document.querySelectorAll('.card-text').forEach(el => {
          el.classList.remove('refreshing');
        });
      })
      .catch(error => {
        console.error('Error fetching metrics:', error);
        
        // Remove loading state
        document.querySelectorAll('.card-text').forEach(el => {
          el.classList.remove('refreshing');
        });
        
        // Display error message
        document.getElementById('errorAlert').textContent = `Failed to fetch metrics: ${error.message}`;
        document.getElementById('errorAlert').classList.remove('d-none');
        setTimeout(() => {
          document.getElementById('errorAlert').classList.add('d-none');
        }, 5000);
      });
  }

  /**
   * Update dashboard with new data
   */
  function updateDashboard(data) {
    // Update overview metrics
    document.getElementById('smsRateLimitCount').textContent = data.sms.rateExceededCount || 0;
    document.getElementById('emailRateLimitCount').textContent = data.email.rateExceededCount || 0;
    
    // Process workspace data
    const workspaces = [];
    
    // Process SMS workspaces
    if (data.sms && data.sms.workspaceRateLimits) {
      Object.entries(data.sms.workspaceRateLimits).forEach(([workspaceId, metrics]) => {
        const existing = workspaces.find(w => w.workspaceId === workspaceId);
        if (existing) {
          existing.smsCount = metrics.count || 0;
          existing.smsLastExceeded = metrics.lastExceeded;
          if (metrics.lastExceeded && (!existing.lastExceeded || new Date(metrics.lastExceeded) > new Date(existing.lastExceeded))) {
            existing.lastExceeded = metrics.lastExceeded;
          }
        } else {
          workspaces.push({
            workspaceId,
            smsCount: metrics.count || 0,
            emailCount: 0,
            smsLastExceeded: metrics.lastExceeded,
            emailLastExceeded: null,
            lastExceeded: metrics.lastExceeded
          });
        }
      });
    }
    
    // Process Email workspaces
    if (data.email && data.email.workspaceRateLimits) {
      Object.entries(data.email.workspaceRateLimits).forEach(([workspaceId, metrics]) => {
        const existing = workspaces.find(w => w.workspaceId === workspaceId);
        if (existing) {
          existing.emailCount = metrics.count || 0;
          existing.emailLastExceeded = metrics.lastExceeded;
          if (metrics.lastExceeded && (!existing.lastExceeded || new Date(metrics.lastExceeded) > new Date(existing.lastExceeded))) {
            existing.lastExceeded = metrics.lastExceeded;
          }
        } else {
          workspaces.push({
            workspaceId,
            smsCount: 0,
            emailCount: metrics.count || 0,
            smsLastExceeded: null,
            emailLastExceeded: metrics.lastExceeded,
            lastExceeded: metrics.lastExceeded
          });
        }
      });
    }
    
    // Sort workspaces by total count
    workspaces.sort((a, b) => {
      const totalA = a.smsCount + a.emailCount;
      const totalB = b.smsCount + b.emailCount;
      return totalB - totalA;
    });
    
    // Update affected workspaces count
    document.getElementById('affectedWorkspacesCount').textContent = workspaces.length;
    
    // Update last exceedance info
    if (workspaces.length > 0) {
      const mostRecent = [...workspaces].sort((a, b) => {
        if (!a.lastExceeded) return 1;
        if (!b.lastExceeded) return -1;
        return new Date(b.lastExceeded) - new Date(a.lastExceeded);
      })[0];
      
      if (mostRecent.lastExceeded) {
        document.getElementById('lastExceedanceTime').textContent = formatDate(mostRecent.lastExceeded);
        document.getElementById('lastExceedanceWorkspace').textContent = `Workspace: ${mostRecent.workspaceId}`;
      } else {
        document.getElementById('lastExceedanceTime').textContent = 'N/A';
        document.getElementById('lastExceedanceWorkspace').textContent = 'No recent exceedances';
      }
    } else {
      document.getElementById('lastExceedanceTime').textContent = 'N/A';
      document.getElementById('lastExceedanceWorkspace').textContent = 'No exceedances recorded';
    }
    
    // Update workspaces table
    updateWorkspacesTable(workspaces.slice(0, config.maxWorkspaces));
    
    // Update charts
    updateCharts(data);
  }

  /**
   * Update the workspaces table
   */
  function updateWorkspacesTable(workspaces) {
    const tableBody = document.getElementById('workspacesTableBody');
    tableBody.innerHTML = '';
    
    if (workspaces.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.textContent = 'No workspaces have exceeded rate limits';
      cell.className = 'text-center';
      row.appendChild(cell);
      tableBody.appendChild(row);
      return;
    }
    
    workspaces.forEach(workspace => {
      const row = document.createElement('tr');
      
      // Workspace ID
      const idCell = document.createElement('td');
      idCell.textContent = workspace.workspaceId;
      row.appendChild(idCell);
      
      // SMS Exceedances
      const smsCell = document.createElement('td');
      smsCell.textContent = workspace.smsCount;
      row.appendChild(smsCell);
      
      // Email Exceedances
      const emailCell = document.createElement('td');
      emailCell.textContent = workspace.emailCount;
      row.appendChild(emailCell);
      
      // Last Exceeded
      const lastCell = document.createElement('td');
      lastCell.textContent = workspace.lastExceeded ? formatDate(workspace.lastExceeded) : 'N/A';
      row.appendChild(lastCell);
      
      // Actions
      const actionsCell = document.createElement('td');
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn btn-sm btn-primary me-2';
      viewBtn.textContent = 'View Details';
      viewBtn.addEventListener('click', () => viewWorkspaceDetails(workspace.workspaceId));
      actionsCell.appendChild(viewBtn);
      
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn btn-sm btn-warning';
      resetBtn.textContent = 'Reset';
      resetBtn.addEventListener('click', () => resetWorkspaceMetrics(null, workspace.workspaceId));
      actionsCell.appendChild(resetBtn);
      
      row.appendChild(actionsCell);
      
      tableBody.appendChild(row);
    });
  }

  /**
   * Update charts with new data
   */
  function updateCharts(data) {
    // Update exceedances by type chart
    exceedancesByTypeChart.data.datasets[0].data = [
      data.sms.rateExceededCount || 0,
      data.email.rateExceededCount || 0
    ];
    exceedancesByTypeChart.update();
    
    // For the time series chart, we'd need historical data
    // This is a simplified version - in a real implementation,
    // you might want to fetch historical data from an endpoint
    
    // For now, let's just use the current timestamp
    const now = new Date();
    
    // Add new data point (this is simplified)
    exceedancesChart.data.labels.push(formatTime(now));
    exceedancesChart.data.datasets[0].data.push(data.sms.rateExceededCount || 0);
    exceedancesChart.data.datasets[1].data.push(data.email.rateExceededCount || 0);
    
    // Keep only the last 10 data points
    if (exceedancesChart.data.labels.length > 10) {
      exceedancesChart.data.labels.shift();
      exceedancesChart.data.datasets.forEach(dataset => {
        dataset.data.shift();
      });
    }
    
    exceedancesChart.update();
  }

  /**
   * View details for a specific workspace
   */
  function viewWorkspaceDetails(workspaceId) {
    currentWorkspaceId = workspaceId;
    
    // Show loading state in modal
    document.getElementById('workspaceDetailModalLabel').textContent = `Workspace: ${workspaceId} (Loading...)`;
    document.getElementById('smsDetailCount').textContent = '-';
    document.getElementById('smsDetailLastExceeded').textContent = '-';
    document.getElementById('emailDetailCount').textContent = '-';
    document.getElementById('emailDetailLastExceeded').textContent = '-';
    document.getElementById('smsDetailTableBody').innerHTML = '';
    document.getElementById('emailDetailTableBody').innerHTML = '';
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('workspaceDetailModal'));
    modal.show();
    
    // Fetch workspace details
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    fetch(`${apiUrl}/metrics/workspace/${workspaceId}`)
      .then(response => response.json())
      .then(data => {
        currentWorkspaceData = data;
        updateWorkspaceDetailModal(data);
      })
      .catch(error => {
        console.error('Error fetching workspace details:', error);
        document.getElementById('workspaceDetailModalLabel').textContent = `Workspace: ${workspaceId} (Error loading data)`;
      });
  }

  /**
   * Update the workspace detail modal with data
   */
  function updateWorkspaceDetailModal(data) {
    // Update modal title
    document.getElementById('workspaceDetailModalLabel').textContent = `Workspace: ${data.workspaceId}`;
    
    // Update SMS details
    if (data.sms) {
      document.getElementById('smsDetailCount').textContent = data.sms.count || 0;
      document.getElementById('smsDetailLastExceeded').textContent = data.sms.lastExceeded ? 
        formatDate(data.sms.lastExceeded) : 'Never';
      
      // Update SMS details table
      const smsTableBody = document.getElementById('smsDetailTableBody');
      smsTableBody.innerHTML = '';
      
      if (data.sms.details && data.sms.details.length > 0) {
        data.sms.details.forEach(detail => {
          const row = document.createElement('tr');
          
          const timestampCell = document.createElement('td');
          timestampCell.textContent = formatDate(detail.timestamp);
          row.appendChild(timestampCell);
          
          const batchSizeCell = document.createElement('td');
          batchSizeCell.textContent = detail.batchSize;
          row.appendChild(batchSizeCell);
          
          const errorCell = document.createElement('td');
          errorCell.textContent = detail.errorMessage;
          row.appendChild(errorCell);
          
          smsTableBody.appendChild(row);
        });
      } else {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.textContent = 'No detailed records available';
        cell.className = 'text-center';
        row.appendChild(cell);
        smsTableBody.appendChild(row);
      }
    } else {
      document.getElementById('smsDetailCount').textContent = '0';
      document.getElementById('smsDetailLastExceeded').textContent = 'Never';
      
      const smsTableBody = document.getElementById('smsDetailTableBody');
      smsTableBody.innerHTML = '';
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.textContent = 'No SMS rate limit exceedances';
      cell.className = 'text-center';
      row.appendChild(cell);
      smsTableBody.appendChild(row);
    }
    
    // Update Email details
    if (data.email) {
      document.getElementById('emailDetailCount').textContent = data.email.count || 0;
      document.getElementById('emailDetailLastExceeded').textContent = data.email.lastExceeded ? 
        formatDate(data.email.lastExceeded) : 'Never';
      
      // Update Email details table
      const emailTableBody = document.getElementById('emailDetailTableBody');
      emailTableBody.innerHTML = '';
      
      if (data.email.details && data.email.details.length > 0) {
        data.email.details.forEach(detail => {
          const row = document.createElement('tr');
          
          const timestampCell = document.createElement('td');
          timestampCell.textContent = formatDate(detail.timestamp);
          row.appendChild(timestampCell);
          
          const batchSizeCell = document.createElement('td');
          batchSizeCell.textContent = detail.batchSize;
          row.appendChild(batchSizeCell);
          
          const errorCell = document.createElement('td');
          errorCell.textContent = detail.errorMessage;
          row.appendChild(errorCell);
          
          emailTableBody.appendChild(row);
        });
      } else {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 3;
        cell.textContent = 'No detailed records available';
        cell.className = 'text-center';
        row.appendChild(cell);
        emailTableBody.appendChild(row);
      }
    } else {
      document.getElementById('emailDetailCount').textContent = '0';
      document.getElementById('emailDetailLastExceeded').textContent = 'Never';
      
      const emailTableBody = document.getElementById('emailDetailTableBody');
      emailTableBody.innerHTML = '';
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.textContent = 'No Email rate limit exceedances';
      cell.className = 'text-center';
      row.appendChild(cell);
      emailTableBody.appendChild(row);
    }
  }

  /**
   * Reset metrics for a specific workspace
   */
  function resetWorkspaceMetrics(type = null, workspaceId = null) {
    // If no workspaceId is provided, use the current one from the modal
    const targetWorkspaceId = workspaceId || currentWorkspaceId;
    
    if (!targetWorkspaceId) {
      console.error('No workspace ID provided for reset');
      return;
    }
    
    // Confirm reset
    if (!confirm(`Are you sure you want to reset ${type ? type.toUpperCase() : 'all'} metrics for workspace ${targetWorkspaceId}?`)) {
      return;
    }
    
    // Build request body
    const body = {
      workspaceId: targetWorkspaceId
    };
    
    if (type) {
      body.type = type;
    }
    
    // Send reset request
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    fetch(`${apiUrl}/metrics/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to reset metrics');
        }
        return response.json();
      })
      .then(() => {
        // Refresh dashboard data
        fetchDashboardData();
        
        // If we're in the modal, refresh the workspace details
        if (currentWorkspaceId === targetWorkspaceId) {
          viewWorkspaceDetails(targetWorkspaceId);
        }
        
        alert(`Metrics for workspace ${targetWorkspaceId} have been reset.`);
      })
      .catch(error => {
        console.error('Error resetting metrics:', error);
        alert(`Error resetting metrics: ${error.message}`);
      });
  }

  /**
   * Reset all metrics
   */
  function resetAllMetrics() {
    // Confirm reset
    if (!confirm('Are you sure you want to reset ALL metrics for ALL workspaces? This cannot be undone.')) {
      return;
    }
    
    // Send reset request
    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';
    fetch(`${apiUrl}/metrics/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to reset metrics');
        }
        return response.json();
      })
      .then(() => {
        // Refresh dashboard data
        fetchDashboardData();
        alert('All metrics have been reset.');
      })
      .catch(error => {
        console.error('Error resetting metrics:', error);
        alert(`Error resetting metrics: ${error.message}`);
      });
  }

  /**
   * Search for a specific workspace
   */
  function searchWorkspace() {
    const searchInput = document.getElementById('workspaceSearch');
    const workspaceId = searchInput.value.trim();
    
    if (!workspaceId) {
      alert('Please enter a workspace ID to search');
      return;
    }
    
    viewWorkspaceDetails(workspaceId);
  }

  /**
   * Save dashboard settings
   */
  function saveSettings(e) {
    e.preventDefault();
    
    // Get form values
    const refreshInterval = parseInt(document.getElementById('refreshInterval').value);
    const maxWorkspaces = parseInt(document.getElementById('maxWorkspaces').value);
    const darkMode = document.getElementById('darkMode').checked;
    
    // Validate
    if (refreshInterval < 5) {
      alert('Refresh interval must be at least 5 seconds');
      return;
    }
    
    if (maxWorkspaces < 5 || maxWorkspaces > 100) {
      alert('Maximum workspaces must be between 5 and 100');
      return;
    }
    
    // Update config
    config.refreshInterval = refreshInterval;
    config.maxWorkspaces = maxWorkspaces;
    config.darkMode = darkMode;
    
    // Save to localStorage
    localStorage.setItem('dashboardSettings', JSON.stringify(config));
    
    // Apply dark mode
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    // Restart auto-refresh with new interval
    startAutoRefresh();
    
    // Refresh data to apply new maxWorkspaces
    fetchDashboardData();
    
    alert('Settings saved');
  }

  /**
   * Start auto-refresh timer
   */
  function startAutoRefresh() {
    // Clear existing timer
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    
    // Start new timer
    refreshTimer = setInterval(fetchDashboardData, config.refreshInterval * 1000);
  }

  /**
   * Format a date for display
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  /**
   * Format a time for chart display
   */
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
});
