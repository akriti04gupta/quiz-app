function setDashboardLoading(isLoading) {
  const dashboardTab = document.getElementById('dashboard-tab');
  if (!dashboardTab) return;
  if (isLoading) {
    dashboardTab.classList.add('loading');
    document.getElementById('totalQuestionsValue').textContent = '...';
    document.getElementById('totalUsersValue').textContent = '...';
    document.getElementById('avgTimeValue').textContent = '...';
    document.getElementById('avgScoreValue').textContent = '...';
  } else {
    dashboardTab.classList.remove('loading');
  }
}

async function loadDashboard() {
  try {
    setDashboardLoading(true);
    const response = await fetch(`${window.API_BASE_URL}/api/dashboard`);
    if (!response.ok) throw new Error('Failed to load dashboard');
    
    const data = await response.json();
    
    document.getElementById('totalQuestionsValue').textContent = data.totalQuestions || 0;
    document.getElementById('totalUsersValue').textContent = data.uniqueUsers || 0;
    document.getElementById('avgTimeValue').textContent = formatTime(data.averageTimeSeconds || 0);
    document.getElementById('avgScoreValue').textContent = Math.round(parseFloat(data.averageScore) || 0);

    let categoryHTML = '';
    const categories = data.questionsByCategory || {};
    const categoryNames = Object.keys(categories).sort();
    
    if (categoryNames.length > 0) {
      categoryNames.forEach(category => {
        const count = categories[category];
        categoryHTML += `<div class="stat-item" onclick="filterByCategory('${category}')">
          <span style="font-weight: 500;">${category}</span>
          <span style="color: #ff3b00; font-weight: 600;">${count}</span>
        </div>`;
      });
    } else {
      categoryHTML = '<div style="padding: 12px; color: rgba(239,233,221,0.6);">No categories available</div>';
    }
    document.getElementById('categoryStats').innerHTML = categoryHTML;

    let difficultyHTML = '';
    const difficulties = data.questionsByDifficulty || {};
    const difficultyOrder = ['easy', 'medium', 'hard', 'veryHard'];
    
    difficultyOrder.forEach(diff => {
      if (difficulties[diff] !== undefined) {
        const displayName = diff === 'veryHard' ? 'Very Hard' : diff.charAt(0).toUpperCase() + diff.slice(1);
        const count = difficulties[diff];
        difficultyHTML += `<div class="stat-item" onclick="filterByDifficulty('${diff}')">
          <span style="font-weight: 500;">${displayName}</span>
          <span style="color: #ff3b00; font-weight: 600;">${count}</span>
        </div>`;
      }
    });
    
    if (difficultyHTML === '') {
      difficultyHTML = '<div style="padding: 12px; color: rgba(239,233,221,0.6);">No difficulties available</div>';
    }
    document.getElementById('difficultyStats').innerHTML = difficultyHTML;
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showPopup('Error loading dashboard data', 'error');
  } finally {
    setDashboardLoading(false);
  }
}

function filterByCategory(category) {
  const navItem = document.querySelector('.nav-item[data-tab="questions"]');
  showTab('questions', navItem);
  document.getElementById('categoryFilter').value = category;
  appState.currentFilters.category = category;
  applyFilters();
}

function filterByDifficulty(difficulty) {
  const navItem = document.querySelector('.nav-item[data-tab="questions"]');
  showTab('questions', navItem);
  document.getElementById('difficultyFilter').value = difficulty;
  appState.currentFilters.difficulty = difficulty;
  applyFilters();
}

window.setDashboardLoading = setDashboardLoading;
window.loadDashboard = loadDashboard;
window.filterByCategory = filterByCategory;
window.filterByDifficulty = filterByDifficulty;
