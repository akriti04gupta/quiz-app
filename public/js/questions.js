async function loadQuestions() {
  try {
    const response = await fetch(`${window.API_BASE_URL}/api/quiz/all`);
    if (!response.ok) throw new Error('Failed to load questions');
    
    appState.allQuestions = await response.json();
    applyFilters();
  } catch (error) {
    console.error('Error loading questions:', error);
    showPopup('Error loading questions', 'error');
  }
}

function applyFilters() {
  let filtered = appState.allQuestions;

  if (appState.currentFilters.category) {
    filtered = filtered.filter(q => q.category === appState.currentFilters.category);
  }

  if (appState.currentFilters.difficulty) {
    filtered = filtered.filter(q => q.difficulty === appState.currentFilters.difficulty);
  }

  if (appState.currentFilters.status) {
    if (appState.currentFilters.status === 'used') {
      filtered = filtered.filter(q => q.used === true);
    } else if (appState.currentFilters.status === 'unused') {
      filtered = filtered.filter(q => q.used !== true);
    }
  }

  if (appState.currentFilters.search) {
    const searchLower = appState.currentFilters.search.toLowerCase();
    filtered = filtered.filter(q => q.question.toLowerCase().includes(searchLower));
  }

  renderQuestions(filtered);
}

function renderQuestions(questions) {
  let html = '';
  if (questions.length === 0) {
    html = '<div style="padding: 20px; color: rgba(239,233,221,0.6); text-align: center;">No questions found</div>';
  } else {
    questions.forEach(question => {
      const statusText = question.used ? 'Used' : 'Unused';
      const statusColor = question.used ? '#ff3b00' : '#4ade80';
      const statusBg = question.used ? 'rgba(255,59,0,0.2)' : 'rgba(74,222,128,0.2)';
      
      html += `<div class="question-item">
        <div class="question-header">
          <div style="flex: 1;">
            <div class="question-text">${question.question}</div>
            <div class="question-meta">
              <span class="meta-tag">${question.category}</span>
              <span class="meta-tag">${question.difficulty === 'veryHard' ? 'Very Hard' : question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}</span>
              <span class="meta-tag" style="background: ${statusBg}; color: ${statusColor};">${statusText}</span>
            </div>
          </div>
          <div class="question-actions">
            <button class="btn btn-secondary btn-sm" onclick="openEditModal('${question.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteQuestion('${question.id}')">Delete</button>
          </div>
        </div>
      </div>`;
    });
  }
  document.getElementById('questionsList').innerHTML = html;
}

async function openEditModal(questionId) {
  try {
    const response = await fetch(`${window.API_BASE_URL}/api/questions/${questionId}`);
    if (!response.ok) throw new Error('Failed to load question');
    
    const question = await response.json();
    appState.currentEditingQuestionId = questionId;
    
    document.getElementById('editQuestion').value = question.question;
    document.getElementById('editCategory').value = question.category;
    document.getElementById('editDifficulty').value = question.difficulty;
    
    for (let i = 0; i < 4; i++) {
      document.getElementById(`editOption${i}`).value = question.options[i] || '';
      document.getElementById(`editRadio${i}`).checked = (i === question.correctAnswer);
    }
    
    document.getElementById('editModal').classList.add('active');
  } catch (error) {
    showPopup('Error loading question details', 'error');
  }
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('active');
  appState.currentEditingQuestionId = null;
}

async function saveEditedQuestion() {
  const question = document.getElementById('editQuestion').value;
  const category = document.getElementById('editCategory').value;
  const difficulty = document.getElementById('editDifficulty').value;
  const options = [
    document.getElementById('editOption0').value,
    document.getElementById('editOption1').value,
    document.getElementById('editOption2').value,
    document.getElementById('editOption3').value
  ];
  const correctAnswer = document.querySelector('input[name="editCorrectOption"]:checked')?.value;

  if (!question || !category || !difficulty || options.some(o => !o) || correctAnswer === undefined) {
    showPopup('Please fill all fields', 'error');
    return;
  }

  try {
    const response = await fetch(`${window.API_BASE_URL}/api/questions/${appState.currentEditingQuestionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        category,
        difficulty,
        options,
        correctAnswer: parseInt(correctAnswer)
      })
    });

    if (!response.ok) throw new Error('Failed to update question');

    showPopup('Question updated successfully!');
    closeEditModal();
    await loadQuestions();
  } catch (error) {
    showPopup('Error updating question', 'error');
  }
}

function deleteQuestion(questionId) {
  showConfirmation('Are you sure you want to delete this question?', async (confirmed) => {
    if (!confirmed) return;

    try {
      const response = await fetch(`${window.API_BASE_URL}/api/questions/${questionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete question');

      showPopup('Question deleted successfully!');
      await loadQuestions();
    } catch (error) {
      showPopup('Error deleting question', 'error');
    }
  });
}

async function addQuestion() {
  const question = document.getElementById('newQuestion').value;
  const category = document.getElementById('newCategory').value;
  const difficulty = document.getElementById('newDifficulty').value;
  const options = [
    document.getElementById('newOption0').value,
    document.getElementById('newOption1').value,
    document.getElementById('newOption2').value,
    document.getElementById('newOption3').value
  ];
  const correctAnswer = document.querySelector('input[name="newCorrectOption"]:checked')?.value;

  if (!question || !category || !difficulty || options.some(o => !o) || correctAnswer === undefined) {
    showPopup('Please fill all fields including selecting the correct answer', 'error');
    return;
  }

  try {
    const response = await fetch(`${window.API_BASE_URL}/api/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        category,
        difficulty,
        options,
        correctAnswer: parseInt(correctAnswer)
      })
    });

    if (!response.ok) throw new Error('Failed to add question');

    showPopup('Question added successfully!');
    resetAddForm();
  } catch (error) {
    showPopup('Error adding question', 'error');
  }
}

function resetAddForm() {
  document.getElementById('newQuestion').value = '';
  document.getElementById('newCategory').value = '';
  document.getElementById('newDifficulty').value = '';
  document.getElementById('newOption0').value = '';
  document.getElementById('newOption1').value = '';
  document.getElementById('newOption2').value = '';
  document.getElementById('newOption3').value = '';
  document.querySelectorAll('input[name="newCorrectOption"]').forEach(r => r.checked = false);
}

window.loadQuestions = loadQuestions;
window.applyFilters = applyFilters;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEditedQuestion = saveEditedQuestion;
window.deleteQuestion = deleteQuestion;
window.addQuestion = addQuestion;
window.resetAddForm = resetAddForm;
