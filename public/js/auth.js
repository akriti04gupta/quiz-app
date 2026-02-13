async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const loginBox = document.querySelector('.login-box');
  
  if (email === 'admin@kraken' && password === 'admin#321') {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainContainer').classList.remove('hidden');
    setDashboardLoading(true);
    await loadDashboard();
    setDashboardLoading(false);
    showPopup('Login successful! Welcome Admin.');
  } else {
    if (loginBox) {
      loginBox.classList.remove('shake');
      void loginBox.offsetWidth;
      loginBox.classList.add('shake');
    }
    showPopup('Invalid credentials! Please try again.', 'error');
  }
}

window.handleLogin = handleLogin;
