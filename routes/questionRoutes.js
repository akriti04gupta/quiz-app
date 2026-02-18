const express = require('express');
const { db } = require('../config/firebase');

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const questionsRef = db.ref('questions');
    const snapshot = await questionsRef.once('value');
    const questions = snapshot.val();
    
    let foundQuestion = null;
    if (questions && questions[req.params.id]) {
      const q = questions[req.params.id];
      foundQuestion = {
        id: req.params.id,
        question: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer || 0,
        category: q.category,
        difficulty: q.difficulty
      };
    }

    if (!foundQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(foundQuestion);
  } catch (error) {
    console.error('Error loading question:', error);
    res.status(500).json({ error: 'Failed to load question' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { question, category, difficulty, options, correctAnswer } = req.body;
    const normalizedDifficulty = String(difficulty || '').replace(/\s+/g, '').toLowerCase();
    const difficultyValue = normalizedDifficulty === 'veryhard' ? 'veryHard' : normalizedDifficulty;
    const questionsRef = db.ref('questions');
    const snapshot = await questionsRef.once('value');
    const questions = snapshot.val() || {};
    
    const newId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newQuestion = {
      id: newId,
      question,
      options,
      correctAnswer: parseInt(correctAnswer) || 0,
      category: category,
      difficulty: difficultyValue,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    questions[newId] = newQuestion;
    await questionsRef.set(questions);

    console.log(`[/api/questions] Added question: ${newId}`);
    res.json({ success: true, id: newId });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { question, category, difficulty, options, correctAnswer } = req.body;
    const normalizedDifficulty = String(difficulty || '').replace(/\s+/g, '').toLowerCase();
    const difficultyValue = normalizedDifficulty === 'veryhard' ? 'veryHard' : normalizedDifficulty;
    const questionsRef = db.ref('questions');
    const snapshot = await questionsRef.once('value');
    const questions = snapshot.val() || {};
    
    if (!questions[req.params.id]) {
      return res.status(404).json({ error: 'Question not found' });
    }

    questions[req.params.id] = {
      ...questions[req.params.id],
      question,
      options,
      correctAnswer: parseInt(correctAnswer) || 0,
      category,
      difficulty: difficultyValue,
      updatedAt: Date.now()
    };

    await questionsRef.set(questions);

    console.log(`[/api/questions] Updated question: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const questionsRef = db.ref('questions');
    const snapshot = await questionsRef.once('value');
    const questions = snapshot.val() || {};
    
    if (!questions[req.params.id]) {
      return res.status(404).json({ error: 'Question not found' });
    }

    delete questions[req.params.id];
    await questionsRef.set(questions);

    console.log(`[/api/questions] Deleted question: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

module.exports = router;
