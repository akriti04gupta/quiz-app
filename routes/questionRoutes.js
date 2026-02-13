const express = require('express');
const { db } = require('../config/firebase');

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const questionBankRef = db.ref('questionBank');
    const snapshot = await questionBankRef.once('value');
    const questions = snapshot.val();
    
    let foundQuestion = null;
    for (const category in questions) {
      for (const difficulty in questions[category]) {
        const q = questions[category][difficulty].find(
          q => q.id === req.params.id
        );
        if (q) {
          foundQuestion = {
            ...q,
            category: category,
            difficulty: difficulty
          };
          break;
        }
      }
      if (foundQuestion) break;
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
    const questionBankRef = db.ref('questionBank');
    const snapshot = await questionBankRef.once('value');
    const questions = snapshot.val() || {};
    
    const newId = `${category.charAt(0).toUpperCase()}${Date.now()}`;
    
    const newQuestion = {
      id: newId,
      question,
      options,
      correctAnswer
    };

    const cat = category.charAt(0).toUpperCase() + category.slice(1);
    if (!questions[cat]) {
      questions[cat] = {};
    }
    if (!questions[cat][difficulty]) {
      questions[cat][difficulty] = [];
    }

    questions[cat][difficulty].push(newQuestion);
    await questionBankRef.set(questions);

    res.json({ success: true, id: newId });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { question, category, difficulty, options, correctAnswer } = req.body;
    const questionBankRef = db.ref('questionBank');
    const snapshot = await questionBankRef.once('value');
    const questions = snapshot.val() || {};
    
    let found = false;
    for (const cat in questions) {
      for (const diff in questions[cat]) {
        const index = questions[cat][diff].findIndex(
          q => q.id === req.params.id
        );
        if (index !== -1) {
          const normalizedCategory = (category || '').trim();
          const normalizedDifficulty = (difficulty || '').trim();
          if (cat.toLowerCase() !== normalizedCategory.toLowerCase() || diff !== normalizedDifficulty) {
            questions[cat][diff].splice(index, 1);
            const newCat = normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1);
            if (!questions[newCat]) {
              questions[newCat] = {};
            }
            if (!questions[newCat][normalizedDifficulty]) {
              questions[newCat][normalizedDifficulty] = [];
            }
            questions[newCat][normalizedDifficulty].push({
              id: req.params.id,
              question,
              options,
              correctAnswer
            });
          } else {
            questions[cat][diff][index] = {
              id: req.params.id,
              question,
              options,
              correctAnswer
            };
          }
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await questionBankRef.set(questions);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const questionBankRef = db.ref('questionBank');
    const snapshot = await questionBankRef.once('value');
    const questions = snapshot.val() || {};
    
    let found = false;
    for (const cat in questions) {
      for (const diff in questions[cat]) {
        const index = questions[cat][diff].findIndex(
          q => q.id === req.params.id
        );
        if (index !== -1) {
          questions[cat][diff].splice(index, 1);
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) {
      return res.status(404).json({ error: 'Question not found' });
    }

    await questionBankRef.set(questions);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

module.exports = router;
