const express = require('express');
const { db } = require('../config/firebase');

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const questionBankRef = db.ref('questionBank');
    const questionsSnapshot = await questionBankRef.once('value');
    const questions = questionsSnapshot.val();
    
    let allQuestions = [];
    const questionsByCategory = {};
    const questionsByDifficulty = {};
    
    if (questions && typeof questions === 'object') {
      for (const category in questions) {
        const catData = questions[category];
        if (catData && typeof catData === 'object') {
          for (const difficulty in catData) {
            const qArray = catData[difficulty];
            if (Array.isArray(qArray)) {
              qArray.forEach(q => {
                if (q && typeof q === 'object') {
                  allQuestions.push({
                    ...q,
                    category: category,
                    difficulty: difficulty
                  });
                  questionsByCategory[category] = (questionsByCategory[category] || 0) + 1;
                  questionsByDifficulty[difficulty] = (questionsByDifficulty[difficulty] || 0) + 1;
                }
              });
            }
          }
        }
      }
    }

    const attemptsRef = db.ref('quizAttempts');
    const snapshot = await attemptsRef.once('value');
    const attempts = snapshot.val();
    
    let attemptsArray = [];
    if (attempts && typeof attempts === 'object') {
      attemptsArray = Object.keys(attempts).map(key => ({
        id: key,
        ...attempts[key]
      })).filter(a => a && typeof a === 'object');
    }

    const uniqueUsers = new Set(attemptsArray.map(a => a.playerName).filter(Boolean)).size;
    const totalAttempts = attemptsArray.length;
    const totalScore = attemptsArray.reduce((sum, a) => sum + (parseInt(a.score) || 0), 0);
    const totalPoints = attemptsArray.reduce((sum, a) => sum + (parseInt(a.points) || ((parseInt(a.score) || 0) * 10)), 0);
    const totalTimeSeconds = attemptsArray.reduce((sum, a) => sum + (parseInt(a.timeTaken) || 0), 0);
    const avgScore = totalAttempts > 0 ? parseFloat((totalScore / totalAttempts).toFixed(1)) : 0;
    const averagePoints = totalAttempts > 0 ? Math.round(totalPoints / totalAttempts) : 0;
    const averageTimeSeconds = totalAttempts > 0 ? Math.round(totalTimeSeconds / totalAttempts) : 0;

    res.json({
      totalQuestions: allQuestions.length,
      uniqueUsers: uniqueUsers,
      totalAttempts: totalAttempts,
      averageScore: averagePoints,
      averageTimeSeconds: averageTimeSeconds,
      questionsByCategory: questionsByCategory,
      questionsByDifficulty: questionsByDifficulty
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).json({ 
      error: 'Failed to load dashboard data',
      details: error.message,
      totalQuestions: 0,
      uniqueUsers: 0,
      totalAttempts: 0,
      averageScore: 0,
      averageTimeSeconds: 0,
      questionsByCategory: {},
      questionsByDifficulty: {}
    });
  }
});

router.get('/users', async (req, res) => {
  try {
    const attemptsRef = db.ref('quizAttempts');
    const snapshot = await attemptsRef.once('value');
    const attempts = snapshot.val();
    
    if (!attempts || typeof attempts !== 'object') {
      return res.json([]);
    }
    
    const attemptsArray = Object.keys(attempts).map(key => {
      const attempt = attempts[key];
      if (!attempt || typeof attempt !== 'object') {
        return null;
      }
      
      const rawDate = attempt.date || (attempt.timestamp ? new Date(attempt.timestamp).toISOString() : null);
      const dateOnly = rawDate ? rawDate.split('T')[0] : '';
      const score = parseInt(attempt.score) || 0;
      const timeTaken = parseInt(attempt.timeTaken) || 0;
      const questionsAnswered = parseInt(attempt.questionsAnswered || attempt.totalQuestions) || 0;
      
      return {
        id: key,
        playerName: String(attempt.playerName || 'Anonymous').substring(0, 100),
        score: score,
        timeTaken: timeTaken,
        questionsAnswered: questionsAnswered,
        levelReached: Math.max(1, Math.ceil(score / 2)),
        points: Math.round((attempt.points || (score * 10)) || 0),
        date: dateOnly,
        timestamp: parseInt(attempt.timestamp) || 0,
        used: true
      };
    }).filter(item => item !== null);

    res.json(attemptsArray);
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).json({ error: 'Failed to load users', details: error.message });
  }
});

module.exports = router;
