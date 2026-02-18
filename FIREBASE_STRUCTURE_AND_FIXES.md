# Firebase Structure & System Fixes - Complete Guide

## Summary of Changes Made

### 1. **Fixed Firebase Path Consistency** ✅
- **Before**: Questions were being written to `questionBank` path but read from `questions` path (mismatch!)
- **After**: All endpoints consistently use `questions` path
- **Files Updated**:
  - `routes/questionRoutes.js` - Now reads/writes to `questions` path
  - `routes/quizRoutes.js` - Fixed `/api/quiz/all` endpoint logging
  - `utils/questionSelector.js` - Added comprehensive logging

### 2. **Fixed Question Rotation Logic** ✅
- **Purpose**: Prevent question reuse until all questions in a difficulty are used
- **Implementation**:
  - Questions are tracked in `questionRotation/{difficulty}` with `used: []` array
  - When all questions are used, the pool resets automatically
  - Questions are shuffled to prevent predictable order
- **Files**:
  - `utils/questionSelector.js` - Manages question rotation and selection

### 3. **Fixed Leaderboard Endpoint** ✅
- **Created**: `/api/quiz/leaderboard` endpoint
- **Returns**:
  - `today[]` - Today's best score and fastest completion time
  - `allTime[]` - All-time best score and fastest completion time
  - Includes player names, points, and completion times
- **File**: `routes/quizRoutes.js`

### 4. **Fixed Quiz Completion Flow** ✅
- **Try Again Button**: Shows after game over/wrong answer
- **Auto-Redirect**: Automatically redirects to `index.html` after 2.5 seconds
- **Data Saved**: All attempt data saved with player name, score, time, and answers
- **File**: `public/actual_quiz.html`

---

## Firebase Database Structure

### Required Paths:

#### 1. **questions** (Main Question Bank)
```json
{
  "questions": {
    "q_1234567890_abc123": {
      "id": "q_1234567890_abc123",
      "question": "What does HTML stand for?",
      "options": [
        "Hyper Text Markup Language",
        "Home Tool Markup Language",
        "High Tech Modern Language",
        "Home Text Machine Language"
      ],
      "correctAnswer": 0,
      "category": "Web Development",
      "difficulty": "easy",
      "createdAt": 1708176000000,
      "updatedAt": 1708176000000
    },
    "q_1234567891_def456": {
      "id": "q_1234567891_def456",
      "question": "What is 5 + 3?",
      "options": ["7", "8", "9", "10"],
      "correctAnswer": 1,
      "category": "Mathematics",
      "difficulty": "easy",
      "createdAt": 1708176000000,
      "updatedAt": 1708176000000
    }
    // ... more questions
  }
}
```

**Important Fields**:
- `difficulty`: Must be exactly one of: `easy`, `medium`, `hard`, `veryHard`
- `options`: Array of 4 strings (answer choices)
- `correctAnswer`: 0-3 (index of correct answer in options array)
- `category`: Any string (used for filtering/organization)

**Requirements**:
- Minimum 3 questions per difficulty level (12 total for complete quiz)
- Adding more questions is fine (system will rotate them)

---

#### 2. **questionRotation** (Tracks Used Questions)
```json
{
  "questionRotation": {
    "easy": {
      "used": ["q_1234567890_abc123", "q_1234567891_def456"],
      "lastReset": 1708176000000
    },
    "medium": {
      "used": ["q_1234567892_ghi789"],
      "lastReset": 1708176000000
    },
    "hard": {
      "used": [],
      "lastReset": 1708176000000
    },
    "veryHard": {
      "used": [],
      "lastReset": 1708176000000
    }
  }
}
```

**Auto-Managed**: This is automatically created and updated by the system. No manual intervention needed.

---

#### 3. **quizAttempts** (Player Scores & History)
```json
{
  "quizAttempts": {
    "-NzP-abc123def456": {
      "timestamp": 1708176000000,
      "date": "2026-02-18T10:00:00.000Z",
      "playerName": "John Doe",
      "score": 12,
      "totalQuestions": 12,
      "questionsAnswered": 12,
      "levelReached": 4,
      "percentage": 100,
      "points": 120,
      "timeTaken": 245,
      "answers": [
        {
          "questionId": "q_1234567890_abc123",
          "question": "What does HTML stand for?",
          "userAnswer": 0,
          "correctAnswer": 0,
          "isCorrect": true
        },
        // ... more answers
      ]
    }
  }
}
```

**Auto-Managed**: Created when quiz is submitted. No manual intervention needed.

---

## How the System Works Now

### 1. **Quiz Start Flow**
```
User enters name → actual_quiz.html → /api/quiz/start
                    ↓
         Fetches questions from 'questions' path
                    ↓
    Groups into 4 levels: 3 easy, 3 medium, 3 hard, 3 veryHard
                    ↓
            Marks questions as "used" in questionRotation
                    ↓
             Quiz begins with Level 1 countdown
```

### 2. **Question Fetching (questionSelector.js)**
- Reads from `questions` path
- Filters by difficulty (`easy`, `medium`, `hard`, `veryHard`)
- Checks `questionRotation/{difficulty}` for used questions
- Prioritizes unused questions
- When all questions used, resets the pool and reshuffles
- Returns shuffled questions to prevent predictable order

### 3. **Quiz Completion Flow**
```
Player completes all 4 levels (or gets 1 wrong) → endGame()
                    ↓
        Shows game over/success image
                    ↓
     Shows "Try Again" button (clickable immediately)
                    ↓
    Behind scenes: submitAttempt() saves to /api/quiz/submit
                    ↓
    Sends: {answers[], score, time, playerName, levelReached, ...}
                    ↓
        Saves to quizAttempts in Firebase
                    ↓
       Auto-redirects to index.html after 2.5s
```

### 4. **Leaderboard Display (quiz.html)**
```
Page loads → loadLeaderboard() → /api/quiz/leaderboard
                    ↓
     Returns: today's best & all-time best with names & times
                    ↓
  Displays in UI: "Top score: 120 Coins - John Doe"
                  "Fastest: 03:45 - Jane Smith"
```

---

## API Endpoints Overview

| Endpoint | Method | Purpose | Input | Output |
|----------|--------|---------|-------|--------|
| `/api/quiz/start` | GET | Get 12 questions for quiz | none | `{questions: [...]}` |
| `/api/quiz/submit` | POST | Save quiz attempt | `{answers[], score, playerName, ...}` | `{success, score, points}` |
| `/api/quiz/leaderboard` | GET | Get leaderboard data | none | `{today: [], allTime: []}` |
| `/api/quiz/all` | GET | Get all questions with used status | none | `[{question data with used: true/false}]` |
| `/api/questions` | POST | Add new question | `{question, category, difficulty, options[], correctAnswer}` | `{success, id}` |
| `/api/questions/:id` | GET | Get question by ID | none | `{question data}` |
| `/api/questions/:id` | PUT | Update question | `{question, category, ...}` | `{success}` |
| `/api/questions/:id` | DELETE | Delete question | none | `{success}` |
| `/api/dashboard` | GET | Get aggregate stats | none | `{totalQuestions, uniqueUsers, ...}` |
| `/api/users` | GET | Get all user attempts | none | `[{user attempt data}]` |

---

## What You Need to Do Now

### Option 1: Add Questions via Dashboard (Recommended)
1. Open `/dashboard` in browser
2. Go to "Add Question" tab
3. Fill form:
   - **Question**: The question text
   - **Category**: Any category name (e.g., "Web Development")
   - **Difficulty**: Select `easy`, `medium`, `hard`, or `very hard`
   - **Options**: 4 answer choices
   - **Correct Answer**: Select which option is correct
4. Click "Add Question"
5. Questions are now saved to Firebase `questions` path ✅

### Option 2: Verify Existing Questions
1. Open `/dashboard` → "Questions" tab
2. You should see all added questions with:
   - Question text
   - Category badge
   - Difficulty badge
   - **Used/Unused status** (marked in red/green)
3. Filter by "Status: Used" to see which questions have been answered
4. Questions reset after completing a quiz if all questions in that difficulty are used

---

## Testing Checklist

- [ ] Add at least 3 questions per difficulty (12 total)
- [ ] Open `/quiz` page
- [ ] Enter player name and see leaderboard (initially empty or from previous plays)
- [ ] Click "Let's Begin" to start quiz
- [ ] Answer all questions → see results
- [ ] Check "Try Again" button works (goes to index.html)
- [ ] Go to `/quiz` again and see updated leaderboard with your score
- [ ] Verify "Used" status shows in dashboard Questions tab
- [ ] Try playing again to see unused questions rotation

---

## Debugging Tips

### If questions don't show in quiz:
1. Check `/api/quiz/all` endpoint - should return questions with `used: true/false`
2. Check `/api/quiz/start` endpoint - should return 12 questions
3. Check Firebase console - `questions` path should have data
4. Check browser console (F12) for any errors

### If leaderboard doesn't update:
1. Check `/api/quiz/leaderboard` endpoint
2. Verify quiz submission saved (check `/api/users` endpoint)
3. Check Firebase `quizAttempts` path has data

### If "Used" status doesn't show:
1. Check Firebase `questionRotation` path has data
2. Try playing quiz to populate rotation data
3. Refresh `/dashboard` to reload questions

---

## Important Notes

✅ **Fixed**: All Firebase paths are now consistent  
✅ **Fixed**: Question rotation prevents reuse until all questions used  
✅ **Fixed**: Leaderboard shows today's and all-time best with player names  
✅ **Fixed**: Quiz redirects properly with Try Again button  
✅ **Fixed**: All attempt data saved with complete information  

📝 **Manual Step Needed**: Add questions via dashboard or directly to Firebase `questions` path  

🔄 **Auto-Managed**: `questionRotation` and `quizAttempts` are automatically created and updated  

---

## Firebase Rules Summary

The current Firebase rules allow:
- **Questions path**: Admin-only read/write
- **Quiz Attempts path**: Admin read, backend write
- **Question Rotation**: Backend read/write
- **Public data**: Available to authenticated users

Make sure your Firebase rules match the provided `FIREBASE_RULES_PRODUCTION_SECURE.json` file for security.
