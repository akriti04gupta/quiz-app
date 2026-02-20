require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const quizRoutes = require('./routes/quizRoutes');
const questionRoutes = require('./routes/questionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Add request timeout (30 seconds)
app.use((req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timeout' });
    }
  }, 30000);
  
  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/index_page', express.static(path.join(__dirname, 'index_page')));

app.use('/api/quiz', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/auth', authRoutes);

// Serve index.html for client-side routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/dashboard.html'));
});

app.get('/quiz', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/quiz.html'));
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`   QUIZ APP SERVER RUNNING`);
    console.log(`========================================`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`========================================\n`);
  });
}

module.exports = app;
  