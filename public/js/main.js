function showTab(tabName, navItem = null) {
  document.querySelectorAll('[id$="-tab"]').forEach(tab => tab.classList.add('hidden'));
  document.getElementById(tabName + '-tab').classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  if (navItem) {
    navItem.classList.add('active');
  }

  if (tabName === 'dashboard') loadDashboard();
  if (tabName === 'users') {
    loadUsers();
    renderCalendar();
  }
  if (tabName === 'questions') {
    loadQuestions();
  }
}

function initializeEventListeners() {
  const nameSearch = document.getElementById('nameSearch');
  const categoryFilter = document.getElementById('categoryFilter');
  const difficultyFilter = document.getElementById('difficultyFilter');
  const statusFilter = document.getElementById('statusFilter');
  const userNameSearch = document.getElementById('userNameSearch');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');

  const addEnterHandler = (input, handler) => {
    if (!input) return;
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handler();
      }
    });
  };

  if (nameSearch) {
    nameSearch.addEventListener('input', (e) => {
      appState.currentFilters.search = e.target.value;
      applyFilters();
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      appState.currentFilters.category = e.target.value;
      applyFilters();
    });
  }

  if (difficultyFilter) {
    difficultyFilter.addEventListener('change', (e) => {
      appState.currentFilters.difficulty = e.target.value;
      applyFilters();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      appState.currentFilters.status = e.target.value;
      applyFilters();
    });
  }

  if (userNameSearch) {
    userNameSearch.addEventListener('input', (e) => {
      appState.userFilters.name = e.target.value;
      applyUserFilters();
    });
  }

  addEnterHandler(loginEmail, handleLogin);
  addEnterHandler(loginPassword, handleLogin);
  addEnterHandler(document.getElementById('newQuestion'), addQuestion);
  addEnterHandler(document.getElementById('editQuestion'), saveEditedQuestion);
}

document.addEventListener('DOMContentLoaded', initializeEventListeners);

window.showTab = showTab;
