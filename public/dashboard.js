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
        const errorAlert = document.getElementById('errorAlert');
        if (errorAlert) {
          errorAlert.textContent = `Failed to fetch metrics: ${error.message}`;
          errorAlert.classList.remove('d-none');
          setTimeout(() => {
            errorAlert.classList.add('d-none');
          }, 5000);
        } else {
          console.error('Error alert element not found in the DOM');
        }
      });
  }

  /**
   * Update dashboard with new data
   */
  function updateDashboard(data) {
    // Update global metrics
    updateGlobalMetrics(data);
    
    // Update workspace table
    updateWorkspaceTable(data);
    
    // Update workspace stats table
    updateWorkspaceStatsTable(data);
    
    // Update charts
    updateCharts(data);
  }

  /**
   * Update the global metrics section
   */
  function updateGlobalMetrics(data) {
    // Update SMS rate limit count
    const smsRateLimitCount = document.getElementById('smsRateLimitCount');
    if (smsRateLimitCount) {
      smsRateLimitCount.textContent = data.sms && data.sms.totalRateLimitExceedances ? data.sms.totalRateLimitExceedances : 0;
    }
    
    // Update Email rate limit count
    const emailRateLimitCount = document.getElementById('emailRateLimitCount');
    if (emailRateLimitCount) {
      emailRateLimitCount.textContent = data.email && data.email.totalRateLimitExceedances ? data.email.totalRateLimitExceedances : 0;
    }
    
    // Update affected workspaces count
    const affectedWorkspacesCount = document.getElementById('affectedWorkspacesCount');
    if (affectedWorkspacesCount) {
      const uniqueWorkspaces = new Set();
      
      if (data.sms && data.sms.workspaceRateLimits) {
        data.sms.workspaceRateLimits.forEach(w => uniqueWorkspaces.add(w.workspaceId));
      }
      if (data.email && data.email.workspaceRateLimits) {
        data.email.workspaceRateLimits.forEach(w => uniqueWorkspaces.add(w.workspaceId));
      }
      
      affectedWorkspacesCount.textContent = uniqueWorkspaces.size;
    }
    
    // Update last exceedance time and workspace
    const lastExceedanceTime = document.getElementById('lastExceedanceTime');
    const lastExceedanceWorkspace = document.getElementById('lastExceedanceWorkspace');
    
    if (lastExceedanceTime && lastExceedanceWorkspace) {
      let lastSmsExceedance = data.sms && data.sms.lastExceeded ? new Date(data.sms.lastExceeded) : null;
      let lastEmailExceedance = data.email && data.email.lastExceeded ? new Date(data.email.lastExceeded) : null;
      let lastWorkspaceId = null;
      
      if (lastSmsExceedance && lastEmailExceedance) {
        if (lastSmsExceedance > lastEmailExceedance) {
          lastExceedanceTime.textContent = formatDate(lastSmsExceedance);
          lastWorkspaceId = data.sms.lastExceededWorkspaceId;
        } else {
          lastExceedanceTime.textContent = formatDate(lastEmailExceedance);
          lastWorkspaceId = data.email.lastExceededWorkspaceId;
        }
      } else if (lastSmsExceedance) {
        lastExceedanceTime.textContent = formatDate(lastSmsExceedance);
        lastWorkspaceId = data.sms.lastExceededWorkspaceId;
      } else if (lastEmailExceedance) {
        lastExceedanceTime.textContent = formatDate(lastEmailExceedance);
        lastWorkspaceId = data.email.lastExceededWorkspaceId;
      } else {
        lastExceedanceTime.textContent = 'N/A';
      }
      
      lastExceedanceWorkspace.textContent = lastWorkspaceId ? `Workspace: ${lastWorkspaceId}` : 'N/A';
    }
  }

  /**
   * Update the workspace table with rate limit data
   */
  function updateWorkspaceTable(data) {
    const tableBody = document.getElementById('workspaceTableBody');
    if (!tableBody) {
      console.error('Element with ID "workspaceTableBody" not found in the DOM');
      return;
    }
    
    tableBody.innerHTML = '';
    
    // Combine SMS and Email workspace data
    const workspaces = new Map();
    
    // Add SMS workspaces
    if (data.sms && data.sms.workspaceRateLimits) {
      data.sms.workspaceRateLimits.forEach(workspace => {
        // Transform the workspace ID
        const actualWorkspaceId = transformWorkspaceId(workspace.workspaceId);
        
        workspaces.set(workspace.workspaceId, {
          workspaceId: actualWorkspaceId, // Use the transformed ID for display
          originalId: workspace.workspaceId, // Keep the original for API calls
          smsCount: workspace.count,
          emailCount: 0,
          lastExceeded: workspace.lastExceeded
        });
      });
    }
    
    // Add or update with Email workspaces
    if (data.email && data.email.workspaceRateLimits) {
      data.email.workspaceRateLimits.forEach(workspace => {
        // Transform the workspace ID
        const actualWorkspaceId = transformWorkspaceId(workspace.workspaceId);
        
        if (workspaces.has(workspace.workspaceId)) {
          const existing = workspaces.get(workspace.workspaceId);
          existing.emailCount = workspace.count;
          if (new Date(workspace.lastExceeded) > new Date(existing.lastExceeded)) {
            existing.lastExceeded = workspace.lastExceeded;
          }
        } else {
          workspaces.set(workspace.workspaceId, {
            workspaceId: actualWorkspaceId, // Use the transformed ID for display
            originalId: workspace.workspaceId, // Keep the original for API calls
            smsCount: 0,
            emailCount: workspace.count,
            lastExceeded: workspace.lastExceeded
          });
        }
      });
    }
    
    // Convert to array and sort by total count
    const sortedWorkspaces = Array.from(workspaces.values())
      .sort((a, b) => (b.smsCount + b.emailCount) - (a.smsCount + a.emailCount));
    
    // Add rows to table
    if (sortedWorkspaces.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="5" class="text-center">No rate limit exceedances recorded</td>
      `;
      tableBody.appendChild(row);
    } else {
      sortedWorkspaces.forEach(workspace => {
        const row = document.createElement('tr');
        const lastExceeded = workspace.lastExceeded 
          ? new Date(workspace.lastExceeded).toLocaleString() 
          : 'N/A';
        
        row.innerHTML = `
          <td>${workspace.workspaceId}</td>
          <td>${workspace.smsCount}</td>
          <td>${workspace.emailCount}</td>
          <td>${lastExceeded}</td>
          <td>
            <button class="btn btn-sm btn-info view-details-btn" data-workspace-id="${workspace.originalId}">
              View Details
            </button>
            <button class="btn btn-sm btn-warning reset-workspace-btn" data-workspace-id="${workspace.originalId}">
              Reset Metrics
            </button>
          </td>
        `;
        
        tableBody.appendChild(row);
      });
    }
    
    // Add event listeners to buttons
    addWorkspaceButtonListeners();
  }

  /**
   * Update the workspace stats table with message metrics
   */
  function updateWorkspaceStatsTable(data) {
    const tableBody = document.getElementById('workspaceStatsTableBody');
    if (!tableBody) {
      console.error('Element with ID "workspaceStatsTableBody" not found in the DOM');
      return;
    }
    
    tableBody.innerHTML = '';
    
    // Combine SMS and Email workspace data
    const workspaces = new Map();
    
    // Add SMS workspaces
    if (data.sms && data.sms.workspaceMetrics) {
      data.sms.workspaceMetrics.forEach(workspace => {
        // Transform the workspace ID
        const actualWorkspaceId = transformWorkspaceId(workspace.workspaceId);
        
        workspaces.set(workspace.workspaceId, {
          workspaceId: actualWorkspaceId, // Use the transformed ID for display
          originalId: workspace.workspaceId, // Keep the original for API calls
          totalSMS: workspace.totalProcessed,
          successSMS: workspace.successCount,
          failureSMS: workspace.failureCount,
          avgProcessingTimeSMS: workspace.avgProcessingTime,
          totalEmail: 0,
          successEmail: 0,
          failureEmail: 0,
          avgProcessingTimeEmail: 0,
          lastProcessedTime: workspace.lastProcessedTime
        });
      });
    }
    
    // Add or update with Email workspaces
    if (data.email && data.email.workspaceMetrics) {
      data.email.workspaceMetrics.forEach(workspace => {
        // Transform the workspace ID
        const actualWorkspaceId = transformWorkspaceId(workspace.workspaceId);
        
        if (workspaces.has(workspace.workspaceId)) {
          const existing = workspaces.get(workspace.workspaceId);
          existing.totalEmail = workspace.totalProcessed;
          existing.successEmail = workspace.successCount;
          existing.failureEmail = workspace.failureCount;
          existing.avgProcessingTimeEmail = workspace.avgProcessingTime;
          
          // Update last processed time if email was processed more recently
          if (new Date(workspace.lastProcessedTime) > new Date(existing.lastProcessedTime)) {
            existing.lastProcessedTime = workspace.lastProcessedTime;
          }
        } else {
          workspaces.set(workspace.workspaceId, {
            workspaceId: actualWorkspaceId, // Use the transformed ID for display
            originalId: workspace.workspaceId, // Keep the original for API calls
            totalSMS: 0,
            successSMS: 0,
            failureSMS: 0,
            avgProcessingTimeSMS: 0,
            totalEmail: workspace.totalProcessed,
            successEmail: workspace.successCount,
            failureEmail: workspace.failureCount,
            avgProcessingTimeEmail: workspace.avgProcessingTime,
            lastProcessedTime: workspace.lastProcessedTime
          });
        }
      });
    }
    
    // Convert to array and sort by total messages
    const sortedWorkspaces = Array.from(workspaces.values())
      .sort((a, b) => (b.totalSMS + b.totalEmail) - (a.totalSMS + a.totalEmail));
    
    // Add rows to table
    if (sortedWorkspaces.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td colspan="6" class="text-center">No message metrics recorded</td>
      `;
      tableBody.appendChild(row);
    } else {
      sortedWorkspaces.forEach(workspace => {
        const row = document.createElement('tr');
        const lastProcessed = workspace.lastProcessedTime 
          ? new Date(workspace.lastProcessedTime).toLocaleString() 
          : 'N/A';
        
        const totalMessages = workspace.totalSMS + workspace.totalEmail;
        const totalSuccess = workspace.successSMS + workspace.successEmail;
        const successRate = totalMessages > 0 
          ? ((totalSuccess / totalMessages) * 100).toFixed(1) 
          : '0.0';
        
        // Calculate weighted average processing time
        let avgProcessingTime = 0;
        if (workspace.totalSMS > 0 || workspace.totalEmail > 0) {
          const totalWeight = workspace.totalSMS + workspace.totalEmail;
          avgProcessingTime = (
            (workspace.avgProcessingTimeSMS * workspace.totalSMS) + 
            (workspace.avgProcessingTimeEmail * workspace.totalEmail)
          ) / totalWeight;
        }
        
        row.innerHTML = `
          <td>${workspace.workspaceId}</td>
          <td>${totalMessages} (${workspace.totalSMS} SMS, ${workspace.totalEmail} Email)</td>
          <td>${successRate}%</td>
          <td>${avgProcessingTime.toFixed(1)} ms</td>
          <td>${lastProcessed}</td>
          <td>
            <button class="btn btn-sm btn-info view-details-btn" data-workspace-id="${workspace.originalId}">
              View Details
            </button>
            <button class="btn btn-sm btn-warning reset-workspace-btn" data-workspace-id="${workspace.originalId}">
              Reset Metrics
            </button>
          </td>
        `;
        
        tableBody.appendChild(row);
      });
    }
    
    // Add event listeners to buttons
    addWorkspaceButtonListeners();
  }

  /**
   * Update charts with new data
   */
  function updateCharts(data) {
    // Update exceedances by type chart
    if (exceedancesByTypeChart) {
      exceedancesByTypeChart.data.datasets[0].data = [
        data.sms && data.sms.rateExceededCount ? data.sms.rateExceededCount : 0,
        data.email && data.email.rateExceededCount ? data.email.rateExceededCount : 0
      ];
      exceedancesByTypeChart.update();
    }
    
    // Update exceedances over time chart
    if (exceedancesChart) {
      const now = new Date();
      
      // Add new data point
      exceedancesChart.data.labels.push(formatTime(now));
      exceedancesChart.data.datasets[0].data.push(data.sms && data.sms.rateExceededCount ? data.sms.rateExceededCount : 0);
      exceedancesChart.data.datasets[1].data.push(data.email && data.email.rateExceededCount ? data.email.rateExceededCount : 0);
      
      // Keep only the last 10 data points
      if (exceedancesChart.data.labels.length > 10) {
        exceedancesChart.data.labels.shift();
        exceedancesChart.data.datasets[0].data.shift();
        exceedancesChart.data.datasets[1].data.shift();
      }
      
      exceedancesChart.update();
    }
  }

  /**
   * View details for a specific workspace
   */
  function viewWorkspaceDetails(workspaceId) {
    currentWorkspaceId = workspaceId;
    
    // Transform the workspace ID for display
    const displayWorkspaceId = transformWorkspaceId(workspaceId);
    
    // Show loading state in modal
    document.getElementById('workspaceDetailModalLabel').textContent = `Workspace: ${displayWorkspaceId} (Loading...)`;
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
        document.getElementById('workspaceDetailModalLabel').textContent = `Workspace: ${displayWorkspaceId} (Error loading data)`;
      });
  }

  /**
   * Update the workspace detail modal with data
   */
  function updateWorkspaceDetailModal(data) {
    // Update modal title
    document.getElementById('workspaceDetailModalLabel').textContent = `Workspace: ${transformWorkspaceId(data.workspaceId)}`;
    
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
  
  /**
   * Transform workspace ID from generic name to actual numeric ID
   * This function maps generic workspace names to actual numeric IDs for better consistency with Bull dashboard
   */
  function transformWorkspaceId(workspaceId) {
    // Map of generic workspace names to actual numeric IDs
    const workspaceMap = {
      'workspace-1': '66338',
      'workspace-2': '66339',
      'workspace-3': '66340',
      'workspace-4': '66341',
      'workspace-5': '66342'
    };
    
    // If the workspaceId is in our map, return the mapped value, otherwise return the original
    return workspaceMap[workspaceId] || workspaceId;
  }

  /**
   * Add event listeners to workspace buttons
   */
  function addWorkspaceButtonListeners() {
    // View details buttons
    document.querySelectorAll('.view-details-btn').forEach(button => {
      button.addEventListener('click', () => {
        const workspaceId = button.getAttribute('data-workspace-id');
        viewWorkspaceDetails(workspaceId);
      });
    });
    
    // Reset metrics buttons
    document.querySelectorAll('.reset-workspace-btn').forEach(button => {
      button.addEventListener('click', () => {
        const workspaceId = button.getAttribute('data-workspace-id');
        resetWorkspaceMetrics(null, workspaceId);
      });
    });
  }
});
