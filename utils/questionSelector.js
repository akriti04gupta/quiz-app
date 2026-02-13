const { db } = require('../config/firebase');
const { shuffleArray } = require('./helpers');

async function getRandomQuestions(difficulty, count) {
  try {
    const questionBankRef = db.ref('questionBank');
    const snapshot = await questionBankRef.once('value');
    const questionsData = snapshot.val();
    
    let allQuestionsForDifficulty = [];
    
    if (questionsData) {
      for (const category in questionsData) {
        const catData = questionsData[category];
        if (catData && catData[difficulty]) {
          const qArray = catData[difficulty];
          if (Array.isArray(qArray)) {
            qArray.forEach(q => {
              allQuestionsForDifficulty.push({
                ...q,
                category: category,
                difficulty: difficulty
              });
            });
          }
        }
      }
    }
    
    if (allQuestionsForDifficulty.length === 0) {
      console.error(`No questions found for difficulty: ${difficulty}`);
      return [];
    }
    
    const usedQuestionsRef = db.ref(`questionRotation/${difficulty}`);
    const usedSnapshot = await usedQuestionsRef.once('value');
    const usedQuestionsData = usedSnapshot.val() || { used: [], lastReset: Date.now() };
    
    let availableQuestions = allQuestionsForDifficulty.filter(q => 
      !usedQuestionsData.used.some(used => used === q.id)
    );
    
    if (availableQuestions.length < count) {
      console.log(`Resetting ${difficulty} question pool. Used ${usedQuestionsData.used.length} of ${allQuestionsForDifficulty.length} questions.`);
      availableQuestions = allQuestionsForDifficulty;
      usedQuestionsData.used = [];
    }
    
    const shuffled = shuffleArray(availableQuestions);
    const selected = shuffled.slice(0, count);
    
    usedQuestionsData.used = [...usedQuestionsData.used, ...selected.map(q => q.id)];
    usedQuestionsData.lastReset = usedQuestionsData.lastReset || Date.now();
    await usedQuestionsRef.set(usedQuestionsData);
    
    return selected;
  } catch (error) {
    console.error(`Error getting random questions for ${difficulty}:`, error);
    return [];
  }
}

module.exports = { getRandomQuestions };
