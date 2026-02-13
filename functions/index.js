/**
 * Cloud Functions for Enterprise-Grade Quiz System
 * 
 * IMPORTANT: Cloud Functions use Admin SDK which BYPASSES Firebase Rules.
 * This means all validation and security must happen server-side in this code.
 * Firebase Rules only protect against direct client access.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const rateLimit = require('express-rate-limit');

admin.initializeApp();
const db = admin.database();
const auth = admin.auth();

// ============================================================================
// RATE LIMITING CONFIG
// ============================================================================

const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 quiz submissions per 15 minutes
  keyGenerator: (req) => req.user?.uid || req.ip,
  message: 'Too many quiz submissions. Please try again later.',
  skip: (req) => req.isCloudFunction === true // Skip rate limiting for internal Cloud Functions
});

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Max 50 questions per hour
  keyGenerator: (req) => req.user?.uid || req.ip,
  message: 'Too many question creation requests. Please try again later.'
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate score from answers server-side (NEVER TRUST CLIENT)
 * @param {Array} answers - Array of answer objects from client
 * @returns {Object} - Calculated results
 */
function calculateScoreServerSide(answers) {
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error('Invalid answers array');
  }

  let correctCount = 0;
  const validatedAnswers = [];

  for (const answer of answers) {
    // Validate answer structure
    if (!answer.questionId || !Number.isInteger(answer.userAnswer) || !Number.isInteger(answer.correctAnswer)) {
      throw new Error('Invalid answer structure');
    }

    // Determine if correct (server-side recalculation)
    const isCorrect = answer.userAnswer === answer.correctAnswer;
    if (isCorrect) correctCount++;

    validatedAnswers.push({
      questionId: String(answer.questionId),
      question: String(answer.question || ''),
      userAnswer: Number(answer.userAnswer),
      correctAnswer: Number(answer.correctAnswer),
      isCorrect: isCorrect
    });
  }

  // Calculate metrics server-side
  const totalQuestions = validatedAnswers.length;
  const score = Math.round((correctCount / totalQuestions) * 100); // 0-100
  const points = score * 10; // 0-1000 (10 points per percent)
  const percentage = `${score}%`;

  return {
    score,           // 0-100
    points,          // 0-1000
    percentage,      // "85%"
    correctCount,    // number of correct answers
    totalQuestions,  // total questions answered
    answers: validatedAnswers
  };
}

/**
 * Validate quiz submission data
 */
function validateSubmission(data) {
  const errors = [];

  // Player name validation
  if (!data.playerName || typeof data.playerName !== 'string') {
    errors.push('Invalid playerName');
  } else if (data.playerName.length < 1 || data.playerName.length > 100) {
    errors.push('playerName must be 1-100 characters');
  } else if (!/^[a-zA-Z0-9\s\-_.]*$/.test(data.playerName)) {
    errors.push('playerName contains invalid characters');
  }

  // Answers validation
  if (!Array.isArray(data.answers) || data.answers.length === 0) {
    errors.push('Invalid answers array');
  } else if (data.answers.length > 100) {
    errors.push('Too many answers (max 100)');
  }

  // TimeTaken validation
  if (typeof data.timeTaken !== 'number' || data.timeTaken < 0 || data.timeTaken > 86400) {
    errors.push('Invalid timeTaken (must be 0-86400 seconds)');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Log audit trail
 */
async function logAuditEvent(uid, action, resource, details = '', changes = '') {
  try {
    await db.ref('auditLogs').push({
      action: action,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      uid: uid,
      resource: resource,
      details: details.substring(0, 500), // Max 500 chars
      changes: changes.substring(0, 1000) // Max 1000 chars
    });
  } catch (error) {
    console.error('Audit logging error:', error);
    // Don't fail the main operation if audit log fails
  }
}

// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================

/**
 * HTTP Cloud Function: Submit Quiz
 * 
 * Handles:
 * - Authentication verification
 * - Input validation
 * - Server-side score calculation (NEVER trust client)
 * - Database writes with validation
 * - Audit logging
 * - Rate limiting
 */
exports.submitQuiz = functions
  .region('us-central1')
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60,
    enforceAppCheck: true // Enforce App Check
  })
  .https.onRequest(async (req, res) => {
    // Apply rate limiting
    submitLimiter(req, res, async () => {
      try {
        // 1. VERIFY AUTHENTICATION
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) {
          return res.status(401).json({ error: 'No authorization token' });
        }

        let uid, userEmail;
        try {
          const decodedToken = await auth.verifyIdToken(token);
          uid = decodedToken.uid;
          userEmail = decodedToken.email;
        } catch (error) {
          return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // 2. VALIDATE INPUT
        const { playerName, timeTaken, answers } = req.body;
        
        try {
          validateSubmission({ playerName, timeTaken, answers });
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }

        // 3. CALCULATE SCORE SERVER-SIDE (CRITICAL FOR SECURITY)
        let calculation;
        try {
          calculation = calculateScoreServerSide(answers);
        } catch (error) {
          return res.status(400).json({ error: 'Failed to calculate score: ' + error.message });
        }

        // 4. BUILD SUBMISSION OBJECT
        const timestamp = admin.database.ServerValue.TIMESTAMP;
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const submission = {
          // User info
          playerName: playerName.trim(),
          submittedBy: uid,
          submittedAt: new Date().toISOString(),

          // Calculated results (from server, NOT client)
          score: calculation.score,          // 0-100 (calculated server-side)
          points: calculation.points,        // 0-1000 (calculated server-side)
          percentage: calculation.percentage, // "85%" (calculated server-side)
          correctCount: calculation.correctCount,
          totalQuestions: calculation.totalQuestions,

          // Metadata
          questionsAnswered: calculation.totalQuestions,
          timeTaken: Math.round(timeTaken),
          timestamp: timestamp,
          date: date,

          // Detailed answer records (immutable)
          answers: calculation.answers.reduce((acc, answer, idx) => {
            acc[idx] = answer;
            return acc;
          }, {})
        };

        // 5. WRITE TO DATABASE (atomic operation)
        const attemptId = db.ref('quizAttempts').push().key;
        
        await Promise.all([
          // Write quiz attempt
          db.ref('quizAttempts').child(attemptId).set(submission),

          // Mark questions as used (for next quiz round)
          ...calculation.answers.map(answer =>
            db.ref('usedQuestions').child(answer.questionId).set({
              id: answer.questionId,
              category: 'quiz', // Updated by question creation function
              difficulty: 'medium', // Updated by question creation function
              timestamp: timestamp,
              lastUsedBy: uid
            }).catch(err => console.error('Error marking question as used:', err))
          ),

          // Log audit event
          logAuditEvent(
            uid,
            'CREATE',
            'quizAttempts',
            `Quiz submitted by ${playerName} (${calculation.score}%)`,
            JSON.stringify({
              score: calculation.score,
              questions: calculation.totalQuestions,
              time: timeTaken,
              correct: calculation.correctCount
            })
          )
        ]);

        // 6. RESPONSE
        res.status(200).json({
          success: true,
          attemptId: attemptId,
          result: {
            score: calculation.score,
            points: calculation.points,
            percentage: calculation.percentage,
            correctCount: calculation.correctCount,
            totalQuestions: calculation.totalQuestions,
            message: `Quiz submitted! You scored ${calculation.percentage}`
          }
        });

      } catch (error) {
        console.error('Error in submitQuiz:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to submit quiz'
        });
      }
    });
  });

/**
 * HTTP Cloud Function: Get Quiz Questions
 * 
 * Returns random questions for quiz, filtered by difficulty
 * Questions are served by admin only to prevent question bank exposure
 */
exports.getQuizQuestions = functions
  .region('us-central1')
  .runWith({
    memory: '256MB',
    timeoutSeconds: 30,
    enforceAppCheck: true
  })
  .https.onRequest(async (req, res) => {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No authorization token' });
      }

      const decodedToken = await auth.verifyIdToken(token);
      
      // Only admins can view questions
      if (decodedToken.admin !== true) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const snapshot = await db.ref('questions').orderByChild('used').equalTo(false).limitToFirst(10).once('value');
      const questions = snapshot.val() || {};

      res.status(200).json({
        success: true,
        questions: questions,
        count: Object.keys(questions).length
      });

    } catch (error) {
      console.error('Error in getQuizQuestions:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });

/**
 * HTTP Cloud Function: Create Question
 * 
 * Admin-only endpoint to create new questions
 * Includes validation and audit logging
 */
exports.createQuestion = functions
  .region('us-central1')
  .runWith({ memory: '256MB', timeoutSeconds: 30, enforceAppCheck: true })
  .https.onRequest(async (req, res) => {
    createLimiter(req, res, async () => {
      try {
        const token = req.headers.authorization?.split('Bearer ')[1];
        if (!token) {
          return res.status(401).json({ error: 'No authorization token' });
        }

        const decodedToken = await auth.verifyIdToken(token);
        if (decodedToken.admin !== true) {
          return res.status(403).json({ error: 'Admin access required' });
        }

        const { question, category, difficulty, options, correctAnswer } = req.body;

        // Validate
        if (!question || question.length < 10 || question.length > 1000) {
          return res.status(400).json({ error: 'Invalid question' });
        }
        if (!['easy', 'medium', 'hard', 'veryHard'].includes(difficulty)) {
          return res.status(400).json({ error: 'Invalid difficulty' });
        }
        if (!Array.isArray(options) || options.length !== 4) {
          return res.status(400).json({ error: 'Must have 4 options' });
        }
        if (correctAnswer < 0 || correctAnswer > 3) {
          return res.status(400).json({ error: 'Invalid correctAnswer' });
        }

        const questionId = db.ref('questions').push().key;
        const now = Date.now();

        const questionData = {
          question,
          category,
          difficulty,
          options,
          correctAnswer,
          used: false,
          createdAt: now,
          updatedAt: now,
          createdBy: decodedToken.uid
        };

        await Promise.all([
          db.ref('questions').child(questionId).set(questionData),
          logAuditEvent(decodedToken.uid, 'CREATE', 'questions', `Question created: ${question.substring(0, 50)}...`)
        ]);

        res.status(201).json({
          success: true,
          questionId: questionId,
          message: 'Question created successfully'
        });

      } catch (error) {
        console.error('Error in createQuestion:', error);
        res.status(500).json({ error: 'Failed to create question' });
      }
    });
  });

/**
 * Scheduled Function: Reset Used Questions Daily
 * 
 * Runs at midnight UTC
 * Clears the used questions pool for next day
 */
exports.resetDailyQuestions = functions
  .region('us-central1')
  .pubsub
  .schedule('0 0 * * *') // Every day at midnight UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      await db.ref('usedQuestions').remove();
      console.log('✅ Daily questions reset completed');
      return null;
    } catch (error) {
      console.error('❌ Error resetting daily questions:', error);
      throw error;
    }
  });

/**
 * Scheduled Function: Cleanup Old Audit Logs
 * 
 * Runs weekly
 * Deletes audit logs older than 90 days
 */
exports.cleanupOldAuditLogs = functions
  .region('us-central1')
  .pubsub
  .schedule('0 2 * * 0') // Every Sunday at 2 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const snapshot = await db.ref('auditLogs')
        .orderByChild('timestamp')
        .endAt(ninetyDaysAgo)
        .once('value');

      const updates = {};
      snapshot.forEach(child => {
        updates[child.key] = null;
      });

      if (Object.keys(updates).length > 0) {
        await db.ref('auditLogs').update(updates);
        console.log(`✅ Deleted ${Object.keys(updates).length} old audit logs`);
      }

      return null;
    } catch (error) {
      console.error('❌ Error cleaning up audit logs:', error);
      throw error;
    }
  });
