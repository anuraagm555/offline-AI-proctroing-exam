const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
// const db = require('./config/database'); // Will implement next

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: true, // Allow any origin
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
    next();
});

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Quiz Application API' });
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const { connectDB } = require('./config/database');
const { initBlockchain } = require('./services/blockchainService');

// Connect Database & Sync Models
connectDB().then(() => {
    // Sync all models that are not already in the database
    const { sequelize } = require('./config/database');
    sequelize.sync();
    console.log('Database synced');
});
// Init Blockchain
initBlockchain();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', require('./routes/quizRoutes'));
app.use('/api/attempts', require('./routes/attemptRoutes'));

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
