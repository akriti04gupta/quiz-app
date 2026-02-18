const express = require('express');
const { db } = require('../config/firebase');
const { getRandomQuestions } = require('../utils/questionSelector');

const router = express.Router();

router.get('/start', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const requiredPerDifficulty = 3;
    const easyQuestions = await getRandomQuestions('easy', requiredPerDifficulty);
    const mediumQuestions = await getRandomQuestions('medium', requiredPerDifficulty);
    const hardQuestions = await getRandomQuestions('hard', requiredPerDifficulty);
    const veryHardQuestions = await getRandomQuestions('veryHard', requiredPerDifficulty);

    const counts = {
      easy: easyQuestions.length,
      medium: mediumQuestions.length,
      hard: hardQuestions.length,
      veryHard: veryHardQuestions.length
    };

    const hasEnough = Object.values(counts).every(count => count >= requiredPerDifficulty);
    if (!hasEnough) {
      return res.status(400).json({
        error: 'Not enough questions per difficulty',
        requiredPerDifficulty,
        counts
      });
    }
    
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
    res.set('Cache-Control', 'no-store');
    const easyQuestions = await getRandomQuestions('easy', 3);
    const mediumQuestions = await getRandomQuestions('medium', 3);
    const hardQuestions = await getRandomQuestions('hard', 3);
    const veryHardQuestions = await getRandomQuestions('veryHard', 3);
    
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
    const { answers, totalQuestions, playerName, timeTaken, score, questionsAnswered, levelReached } = req.body;
    
    console.log('Quiz Submit - Player:', playerName, 'Answers:', answers.length, 'Total:', totalQuestions, 'Time:', timeTaken, 'Score:', score);
    
    let calculatedScore = score || answers.filter(a => a.isCorrect).length;
    const points = calculatedScore * 10;
    const answeredCount = Number.isInteger(questionsAnswered) ? questionsAnswered : answers.length;
    const reachedLevel = Number.isInteger(levelReached) ? levelReached : null;
    
    const safeAnswered = answeredCount > 0 ? answeredCount : 1;
    const attemptData = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      playerName: playerName || 'Anonymous',
      score: calculatedScore,
      totalQuestions: totalQuestions,
      questionsAnswered: answeredCount,
      levelReached: reachedLevel,
      percentage: Math.round((calculatedScore / safeAnswered) * 100),
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

router.post('/mark-used', async (req, res) => {
  try {
    const { questionId, difficulty } = req.body || {};

    if (!questionId || !difficulty) {
      return res.status(400).json({ error: 'questionId and difficulty are required' });
    }

    const normalizedDifficulty = String(difficulty || '').replace(/\s+/g, '').toLowerCase();
    const difficultyKey = normalizedDifficulty === 'veryhard' ? 'veryHard' : normalizedDifficulty;

    const usedQuestionsRef = db.ref(`questionRotation/${difficultyKey}`);
    const usedSnapshot = await usedQuestionsRef.once('value');
    const usedQuestionsData = usedSnapshot.val() || { used: [], lastReset: Date.now() };

    const usedSet = new Set(usedQuestionsData.used || []);
    usedSet.add(String(questionId));
    usedQuestionsData.used = Array.from(usedSet);
    usedQuestionsData.lastReset = usedQuestionsData.lastReset || Date.now();

    await usedQuestionsRef.set(usedQuestionsData);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking question as used:', error);
    res.status(500).json({ error: 'Failed to mark question as used' });
  }
});

router.get('/all', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const questionsRef = db.ref('questions');
    const snapshot = await questionsRef.once('value');
    const questions = snapshot.val();
    
    // Get all question rotation data to determine "used" status
    const rotationRef = db.ref('questionRotation');
    const rotationSnapshot = await rotationRef.once('value');
    const rotationData = rotationSnapshot.val() || {};
    
    // Flatten all used question IDs across all difficulties
    const usedQuestionIds = new Set();
    for (const difficulty in rotationData) {
      const diffUsed = rotationData[difficulty].used || [];
      diffUsed.forEach(qId => usedQuestionIds.add(qId));
    }
    
    let allQuestions = [];
    if (questions) {
      for (const questionId in questions) {
        const q = questions[questionId];
        if (q && typeof q === 'object') {
          allQuestions.push({
            id: questionId,
            question: q.question,
            options: q.options || [],
            correctAnswer: q.correctAnswer || 0,
            category: q.category || 'Uncategorized',
            difficulty: q.difficulty || 'unknown',
            used: usedQuestionIds.has(questionId),
            createdAt: q.createdAt,
            updatedAt: q.updatedAt
          });
        }
      }
    }

    res.json(allQuestions);
  } catch (error) {
    console.error('Error loading questions:', error);
    res.status(500).json({ error: 'Failed to load questions' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const attemptsRef = db.ref('quizAttempts');
    const snapshot = await attemptsRef.once('value');
    const attempts = snapshot.val() || {};
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Convert attempts object to array
    const attemptsArray = Object.keys(attempts).map(id => ({
      ...attempts[id],
      attemptId: id
    }));
    
    // Filter today's attempts
    const todayAttempts = attemptsArray.filter(attempt => {
      const attemptTime = attempt.timestamp || 0;
      return attemptTime >= todayStart;
    });
    
    // Sort by score (descending) then by time (ascending)
    // This way: highest score first, and if tied, fastest time first
    const sortByScore = (a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return (a.timeTaken || 0) - (b.timeTaken || 0);
    };
    
    const todaySortedByScore = [...todayAttempts].sort(sortByScore);
    const allTimeSortedByScore = [...attemptsArray].sort(sortByScore);
    
    const leaderboard = {
      today: [],
      allTime: []
    };
    
    // Add top score for today (with that player's time)
    if (todaySortedByScore.length > 0) {
      leaderboard.today.push({
        playerName: todaySortedByScore[0].playerName || 'Anonymous',
        score: todaySortedByScore[0].score || 0,
        points: todaySortedByScore[0].points || 0,
        timeTaken: todaySortedByScore[0].timeTaken || 0,
        timestamp: todaySortedByScore[0].timestamp || Date.now()
      });
    }
    
    // Add top score for all-time (with that player's time)
    if (allTimeSortedByScore.length > 0) {
      leaderboard.allTime.push({
        playerName: allTimeSortedByScore[0].playerName || 'Anonymous',
        score: allTimeSortedByScore[0].score || 0,
        points: allTimeSortedByScore[0].points || 0,
        timeTaken: allTimeSortedByScore[0].timeTaken || 0,
        timestamp: allTimeSortedByScore[0].timestamp || Date.now()
      });
    }
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

module.exports = router;
