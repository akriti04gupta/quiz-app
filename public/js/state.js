const state = {
  allQuestions: [],
  allUsers: [],
  currentEditingQuestionId: null,
  currentFilters: {
    category: '',
    difficulty: '',
    status: '',
    search: ''
  },
  userFilters: {
    name: '',
    levels: [],
    dates: []
  },
  selectedDates: [],
  filteredUsers: [],
  currentCalendarDate: new Date()
};

window.appState = state;
