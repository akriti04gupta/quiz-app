const express = require('express');
const { db } = require('../config/firebase');
const { getRandomQuestions } = require('../utils/questionSelector');

const router = express.Router();

router.get('/start', async (req, res) => {
  try {
    const easyQuestions = await getRandomQuestions('easy', 3);
    const mediumQuestions = await getRandomQuestions('medium', 3);
    const hardQuestions = await getRandomQuestions('hard', 3);
    const veryHardQuestions = await getRandomQuestions('veryHard', 1);
    
    const allQuestions = [
      ...easyQuestions,
      ...mediumQuestions,
      ...hardQuestions,
      ...veryHardQuestions
    ];
    
    res.json({ questions: allQuestions });
  } catch (error) {
    console.error('Error getting quiz questions:', error);
    res.status(500).json({ error: 'Failed to load quiz questions' });
  }
});

router.get('/getall', async (req, res) => {
  try {
    const easyQuestions = await getRandomQuestions('easy', 3);
    const mediumQuestions = await getRandomQuestions('medium', 3);
    const hardQuestions = await getRandomQuestions('hard', 3);
    const veryHardQuestions = await getRandomQuestions('veryHard', 1);
    
    const allQuestions = [
      ...easyQuestions,
      ...mediumQuestions,
      ...hardQuestions,
      ...veryHardQuestions
    ];
    
    res.json({ questions: allQuestions });
  } catch (error) {
    console.error('Error getting quiz questions:', error);
    res.status(500).json({ error: 'Failed to load quiz questions' });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const { answers, totalQuestions, playerName, timeTaken, score } = req.body;
    
    console.log('Quiz Submit - Player:', playerName, 'Answers:', answers.length, 'Total:', totalQuestions, 'Time:', timeTaken, 'Score:', score);
    
    let calculatedScore = score || answers.filter(a => a.isCorrect).length;
    const points = calculatedScore * 10;
    const questionsAnswered = answers.length;
    
    const attemptData = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      playerName: playerName || 'Anonymous',
      score: calculatedScore,
      totalQuestions: totalQuestions,
      questionsAnswered: questionsAnswered,
      percentage: Math.round((calculatedScore / questionsAnswered) * 100),
      points: points,
      timeTaken: timeTaken || 0,
      answers: answers
    };
    
    console.log('Saving to Firebase:', attemptData);
    
    const ref = db.ref('quizAttempts');
    await ref.push(attemptData);
    
    console.log('Successfully saved quiz attempt');
    
    res.json({ 
      success: true, 
      score: calculatedScore,
      totalQuestions: totalQuestions,
      percentage: attemptData.percentage,
      points: points,
      timeTaken: timeTaken
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: 'Failed to submit quiz', details: error.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const questionBankRef = db.ref('questionBank');
    const snapshot = await questionBankRef.once('value');
    const questions = snapshot.val();
    
    const attemptsRef = db.ref('quizAttempts');
    const attemptsSnapshot = await attemptsRef.once('value');
    const attempts = attemptsSnapshot.val() || {};
    
    const usedQuestionIds = new Set();
    Object.values(attempts).forEach(attempt => {
      if (attempt.answers && Array.isArray(attempt.answers)) {
        attempt.answers.forEach(answer => {
          usedQuestionIds.add(answer.questionId);
        });
      }
    });
    
    let allQuestions = [];
    if (questions) {
      for (const category in questions) {
        const catData = questions[category];
        if (catData && typeof catData === 'object') {
          for (const difficulty in catData) {
            const qArray = catData[difficulty];
            if (Array.isArray(qArray)) {
              qArray.forEach(q => {
                allQuestions.push({
                  ...q,
                  category: category,
                  difficulty: difficulty,
                  used: usedQuestionIds.has(q.id)
                });
              });
            }
          }
        }
      }
    }

    res.json(allQuestions);
  } catch (error) {
    console.error('Error loading questions:', error);
    res.status(500).json({ error: 'Failed to load questions' });
  }
});

module.exports = router;
