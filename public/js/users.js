async function loadUsers() {
  try {
    const response = await fetch('http://localhost:3000/api/users');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error('Invalid data format received:', data);
      appState.allUsers = [];
      applyUserFilters();
      showPopup('Invalid data format received', 'error');
      return;
    }
    
    appState.allUsers = data;
    applyUserFilters();
  } catch (error) {
    console.error('Error loading users:', error);
    appState.allUsers = [];
    applyUserFilters();
    showPopup('Error loading user data', 'error');
  }
}

function renderUsers(users) {
  if (!Array.isArray(users)) {
    console.error('renderUsers called with non-array:', users);
    users = [];
  }
  
  let html = '';
  users.forEach(user => {
    if (!user || typeof user !== 'object') return;
    
    const timeString = formatTime(user.timeTaken || 0);
    const totalPoints = (user.score || 0) * 10;
    const level = Math.max(1, Math.ceil((user.score || 0) / 2));
    const dateStr = escapeHtml(user.date || 'N/A');
    const playerName = escapeHtml(String(user.playerName || 'Anonymous').substring(0, 100));
    
    html += `<tr>
      <td>${playerName}</td>
      <td><span style="color: #ff3b00; font-weight: 600;">${totalPoints}</span></td>
      <td>${timeString}</td>
      <td>${user.questionsAnswered || 0}</td>
      <td><span style="background: rgba(255,59,0,0.2); padding: 4px 8px; border-radius: 4px; color: #ff3b00; font-weight: 600;">Level ${level}</span></td>
      <td>${dateStr}</td>
    </tr>`;
  });
  
  const tbody = document.getElementById('usersTableBody');
  if (tbody) {
    tbody.innerHTML = html || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: rgba(239,233,221,0.6);">No user data yet</td></tr>';
  }
}

function applyUserFilters() {
  if (!Array.isArray(appState.allUsers)) {
    console.error('allUsers is not an array:', appState.allUsers);
    appState.allUsers = [];
  }
  
  let filtered = appState.allUsers.filter(u => u && typeof u === 'object');

  if (appState.userFilters.name) {
    const searchLower = String(appState.userFilters.name).toLowerCase();
    filtered = filtered.filter(u => {
      const playerName = String(u.playerName || '').toLowerCase();
      return playerName.includes(searchLower);
    });
  }

  if (Array.isArray(appState.userFilters.levels) && appState.userFilters.levels.length > 0) {
    filtered = filtered.filter(u => {
      const level = Math.max(1, Math.ceil((u.score || 0) / 2));
      return appState.userFilters.levels.includes(level);
    });
  }

  if (Array.isArray(appState.userFilters.dates) && appState.userFilters.dates.length > 0) {
    filtered = filtered.filter(u => appState.userFilters.dates.includes(u.date));
  }

  appState.filteredUsers = filtered;
  renderUsers(filtered);
}

function updateLevelFilter() {
  const levelValue = document.getElementById('levelFilter').value;
  appState.userFilters.levels = levelValue ? [parseInt(levelValue)] : [];
  applyUserFilters();
}

function downloadCSV() {
  const dataToExport = (Array.isArray(appState.filteredUsers) && appState.filteredUsers.length > 0) 
    ? appState.filteredUsers 
    : appState.allUsers;
    
  if (!Array.isArray(dataToExport) || dataToExport.length === 0) {
    showPopup('No user data to download', 'error');
    return;
  }

  let csv = 'Player Name,Total Points,Time Taken (seconds),Questions Answered,Level Reached,Date Played\n';
  dataToExport.forEach(user => {
    if (!user || typeof user !== 'object') return;
    
    const playerName = String(user.playerName || 'Anonymous').replace(/"/g, '""');
    const totalPoints = (parseInt(user.score) || 0) * 10;
    const level = Math.max(1, Math.ceil((parseInt(user.score) || 0) / 2));
    const dateStr = user.date || 'N/A';
    const timeTaken = parseInt(user.timeTaken) || 0;
    const questionsAnswered = parseInt(user.questionsAnswered) || 0;
    
    csv += `"${playerName}",${totalPoints},${timeTaken},${questionsAnswered},${level},${dateStr}\n`;
  });

  try {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_user_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showPopup('CSV downloaded successfully!');
  } catch (error) {
    console.error('Error downloading CSV:', error);
    showPopup('Error downloading CSV', 'error');
  }
}

window.loadUsers = loadUsers;
window.applyUserFilters = applyUserFilters;
window.updateLevelFilter = updateLevelFilter;
window.downloadCSV = downloadCSV;
