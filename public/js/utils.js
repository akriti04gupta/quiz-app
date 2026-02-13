function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  let timeString = '';
  if (hours > 0) timeString += `${hours}h `;
  if (minutes > 0 || hours > 0) timeString += `${minutes}m `;
  timeString += `${secs}s`;
  return timeString;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showPopup(message, type = 'success') {
  const popup = document.getElementById('popup');
  if (!popup) return;
  
  popup.textContent = message;
  popup.classList.add('show');
  if (type === 'error') {
    popup.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
  } else {
    popup.style.background = 'linear-gradient(135deg, #ff3b00 0%, #ff5c2e 100%)';
  }
  
  setTimeout(() => {
    popup.classList.remove('show');
  }, 3000);
}

function togglePassword() {
  const passwordInput = document.getElementById('loginPassword');
  const eyeIcon = document.getElementById('eyeIcon');
  if (!passwordInput || !eyeIcon) return;
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/><line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  } else {
    passwordInput.type = 'password';
    eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
  }
}

let confirmCallback = null;

function showConfirmation(message, callback) {
  const modal = document.getElementById('confirmationModal');
  const messageElement = document.getElementById('confirmationMessage');
  if (!modal || !messageElement) return;
  
  messageElement.textContent = message;
  confirmCallback = callback;
  modal.classList.add('show');
}

function confirmAction() {
  const modal = document.getElementById('confirmationModal');
  if (modal) modal.classList.remove('show');
  
  if (confirmCallback) {
    confirmCallback(true);
    confirmCallback = null;
  }
}

function cancelAction() {
  const modal = document.getElementById('confirmationModal');
  if (modal) modal.classList.remove('show');
  
  if (confirmCallback) {
    confirmCallback(false);
    confirmCallback = null;
  }
}

window.formatTime = formatTime;
window.escapeHtml = escapeHtml;
window.showPopup = showPopup;
window.togglePassword = togglePassword;
window.showConfirmation = showConfirmation;
window.confirmAction = confirmAction;
window.cancelAction = cancelAction;
