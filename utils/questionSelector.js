const { db } = require('../config/firebase');

function sortByCreatedThenId(a, b) {
  const aTime = Number.isFinite(a.createdAt) ? a.createdAt : 0;
  const bTime = Number.isFinite(b.createdAt) ? b.createdAt : 0;
  if (aTime !== bTime) return aTime - bTime;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

async function getRandomQuestions(difficulty, count) {
  try {
    const questionsRef = db.ref('questions');
    const snapshot = await questionsRef.once('value');
    const questionsData = snapshot.val();
    
    let allQuestionsForDifficulty = [];
    
    if (questionsData && typeof questionsData === 'object') {
      for (const questionId in questionsData) {
        const q = questionsData[questionId];
        if (!q) continue;
        const normalizedDifficulty = String(q.difficulty || '').replace(/\s+/g, '').toLowerCase();
        const targetDifficulty = String(difficulty || '').replace(/\s+/g, '').toLowerCase();
        if (normalizedDifficulty === targetDifficulty) {
          allQuestionsForDifficulty.push({
            id: questionId,
            question: q.question,
            answers: q.options || [],
            correct: q.correctAnswer || 0,
            category: q.category,
            difficulty: q.difficulty,
            createdAt: q.createdAt,
            updatedAt: q.updatedAt
          });
        }
      }
    }

    if (allQuestionsForDifficulty.length === 0) {
      console.error(`❌ No questions found for difficulty: ${difficulty}`);
      return [];
    }
    
    const usedQuestionsRef = db.ref(`questionRotation/${difficulty}`);
    const usedSnapshot = await usedQuestionsRef.once('value');
    const usedQuestionsData = usedSnapshot.val() || { used: [], lastReset: Date.now() };
    const usedSet = new Set(usedQuestionsData.used || []);

    const unusedQuestions = allQuestionsForDifficulty.filter(q => !usedSet.has(q.id));
    const usedQuestions = allQuestionsForDifficulty.filter(q => usedSet.has(q.id));

    let selected = [];

    if (unusedQuestions.length === 0) {
      // All questions have been used; reset pool.
      usedQuestionsData.used = [];
      usedQuestionsData.lastReset = Date.now();
      await usedQuestionsRef.set(usedQuestionsData);

      const sortedAll = [...allQuestionsForDifficulty].sort(sortByCreatedThenId);
      selected = sortedAll.slice(0, count);
    } else if (unusedQuestions.length >= count) {
      const sortedUnused = [...unusedQuestions].sort(sortByCreatedThenId);
      selected = sortedUnused.slice(0, count);
    } else {
      const sortedUnused = [...unusedQuestions].sort(sortByCreatedThenId);
      const usedOrder = (usedQuestionsData.used || []).map(String);
      const usedIndex = new Map(usedOrder.map((id, idx) => [id, idx]));
      const sortedUsed = [...usedQuestions].sort((a, b) => {
        const aIdx = usedIndex.has(String(a.id)) ? usedIndex.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
        const bIdx = usedIndex.has(String(b.id)) ? usedIndex.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return sortByCreatedThenId(a, b);
      });
      selected = [...sortedUnused, ...sortedUsed.slice(0, count - sortedUnused.length)];

      // Unused pool is exhausted for this difficulty.
      // Reset used list now so next quiz starts fresh; seen questions will be re-added via mark-used.
      usedQuestionsData.used = [];
      usedQuestionsData.lastReset = Date.now();
      await usedQuestionsRef.set(usedQuestionsData);
    }

    return selected;
  } catch (error) {
    console.error(`❌ Error getting random questions for ${difficulty}:`, error);
    return [];
  }
}

module.exports = { getRandomQuestions };
