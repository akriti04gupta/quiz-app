function toggleCalendar() {
  const calendarWidget = document.querySelector('.calendar-widget');
  const dateFilterToggle = document.getElementById('dateFilterToggle');
  
  if (dateFilterToggle.value === 'custom') {
    calendarWidget.classList.add('active');
  } else {
    calendarWidget.classList.remove('active');
    appState.selectedDates = [];
    appState.userFilters.dates = [];
    renderSelectedDates();
    applyUserFilters();
  }
}

function renderCalendar() {
  const year = appState.currentCalendarDate.getFullYear();
  const month = appState.currentCalendarDate.getMonth();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  let daysHTML = '';
  
  for (let i = firstDay - 1; i >= 0; i--) {
    daysHTML += `<div class="calendar-day other-month">${daysInPrevMonth - i}</div>`;
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = appState.selectedDates.includes(dateStr);
    const isToday = dateStr === todayStr;
    const classes = ['calendar-day'];
    if (isSelected) classes.push('selected');
    if (isToday) classes.push('today');
    
    daysHTML += `<div class="${classes.join(' ')}" onclick="toggleDateSelection('${dateStr}')">${day}</div>`;
  }
  
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const remainingCells = totalCells - (firstDay + daysInMonth);
  for (let day = 1; day <= remainingCells; day++) {
    daysHTML += `<div class="calendar-day other-month">${day}</div>`;
  }
  
  document.getElementById('calendarDays').innerHTML = daysHTML;
}

function changeMonth(delta) {
  appState.currentCalendarDate.setMonth(appState.currentCalendarDate.getMonth() + delta);
  renderCalendar();
}

function toggleDateSelection(dateStr) {
  const index = appState.selectedDates.indexOf(dateStr);
  if (index > -1) {
    appState.selectedDates.splice(index, 1);
  } else {
    if (appState.selectedDates.length >= 4) {
      showPopup('You can select up to 4 dates', 'error');
      return;
    }
    appState.selectedDates.push(dateStr);
  }
  appState.userFilters.dates = [...appState.selectedDates];
  renderCalendar();
  renderSelectedDates();
  applyUserFilters();
}

function removeSelectedDate(dateValue) {
  appState.selectedDates = appState.selectedDates.filter(d => d !== dateValue);
  appState.userFilters.dates = [...appState.selectedDates];
  renderSelectedDates();
  applyUserFilters();
}

function clearSelectedDates() {
  appState.selectedDates = [];
  appState.userFilters.dates = [];
  document.getElementById('dateFilterToggle').value = '';
  document.querySelector('.calendar-widget').classList.remove('active');
  renderCalendar();
  renderSelectedDates();
  applyUserFilters();
}

function renderSelectedDates() {
  const container = document.getElementById('selectedDates');
  if (!container) return;
  if (appState.selectedDates.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = appState.selectedDates.map(date => (
    `<span class="date-tag">${date}<button type="button" onclick="removeSelectedDate('${date}')">x</button></span>`
  )).join('');
}

window.toggleCalendar = toggleCalendar;
window.renderCalendar = renderCalendar;
window.changeMonth = changeMonth;
window.toggleDateSelection = toggleDateSelection;
window.removeSelectedDate = removeSelectedDate;
window.clearSelectedDates = clearSelectedDates;
