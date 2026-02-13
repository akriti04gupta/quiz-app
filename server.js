require('dotenv').config();
const express = require('express');
const cors = require('cors');

const quizRoutes = require('./routes/quizRoutes');
const questionRoutes = require('./routes/questionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/assets', express.static('assets'));
app.use('/index_page', express.static('index_page'));

app.use('/api/quiz', quizRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api', dashboardRoutes);

// Serve index.html for client-side routing
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

app.get('/quiz', (req, res) => {
  res.sendFile(__dirname + '/public/quiz.html');
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`   QUIZ APP SERVER RUNNING`);
  console.log(`========================================`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`========================================\n`);
});
