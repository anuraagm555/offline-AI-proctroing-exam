const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'student'), defaultValue: 'student' },
    // Gamification V2
    xp: { type: DataTypes.INTEGER, defaultValue: 0 },
    current_streak: { type: DataTypes.INTEGER, defaultValue: 0 },
    last_activity_date: { type: DataTypes.DATE },
    badges: { type: DataTypes.TEXT, defaultValue: '[]' } // JSON array
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

const Quiz = sequelize.define('Quiz', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: false },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    // Adaptive V2
    difficulty_level: { type: DataTypes.STRING, defaultValue: 'medium' },
    adaptive_enabled: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

// Knowledge Mastery Tracking V2
const Mastery = sequelize.define('Mastery', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    topic: { type: DataTypes.STRING, primaryKey: true },
    mastery_score: { type: DataTypes.FLOAT, defaultValue: 0.0 }, // 0.0 - 1.0
    last_updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: false, tableName: 'topic_mastery' });

const Question = sequelize.define('Question', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    quiz_id: { type: DataTypes.INTEGER, allowNull: false },
    question_text: { type: DataTypes.TEXT, allowNull: false },
    // Adaptive V2 Fields
    difficulty_level: { type: DataTypes.INTEGER, defaultValue: 5 }, // 1-10
    concept_tag: { type: DataTypes.STRING, defaultValue: 'General' }
}, { timestamps: true, createdAt: 'created_at', updatedAt: false });

const Option = sequelize.define('Option', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    question_id: { type: DataTypes.INTEGER, allowNull: false },
    option_text: { type: DataTypes.TEXT, allowNull: false },
    is_correct: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: false });

const Attempt = sequelize.define('Attempt', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    quiz_id: { type: DataTypes.INTEGER, allowNull: false },
    score: { type: DataTypes.INTEGER, defaultValue: 0 },
    started_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    completed_at: { type: DataTypes.DATE },
    transaction_hash: { type: DataTypes.STRING },
    // Proctoring V3
    trust_score: { type: DataTypes.INTEGER, defaultValue: 100 },
    proctor_logs: { type: DataTypes.TEXT } // JSON string of suspicious events
}, { timestamps: false });

const Response = sequelize.define('Response', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    attempt_id: { type: DataTypes.INTEGER, allowNull: false },
    question_id: { type: DataTypes.INTEGER, allowNull: false },
    selected_option_id: { type: DataTypes.INTEGER }
}, { timestamps: false });

// Relationships
User.hasMany(Quiz, { foreignKey: 'created_by' });
Quiz.belongsTo(User, { foreignKey: 'created_by' });

Quiz.hasMany(Question, { foreignKey: 'quiz_id', onDelete: 'CASCADE' });
Question.belongsTo(Quiz, { foreignKey: 'quiz_id' });

Question.hasMany(Option, { foreignKey: 'question_id', onDelete: 'CASCADE' });
Option.belongsTo(Question, { foreignKey: 'question_id' });

User.hasMany(Attempt, { foreignKey: 'user_id' });
Attempt.belongsTo(User, { foreignKey: 'user_id' });

Quiz.hasMany(Attempt, { foreignKey: 'quiz_id' });
Attempt.belongsTo(Quiz, { foreignKey: 'quiz_id' });

Attempt.hasMany(Response, { foreignKey: 'attempt_id', onDelete: 'CASCADE' });
Response.belongsTo(Attempt, { foreignKey: 'attempt_id' });
Question.hasMany(Response, { foreignKey: 'question_id', onDelete: 'CASCADE' });
Response.belongsTo(Question, { foreignKey: 'question_id' });
Option.hasMany(Response, { foreignKey: 'selected_option_id' });
Response.belongsTo(Option, { foreignKey: 'selected_option_id' });

// Mastery Relationships (Optional but good for eager loading)
User.hasMany(Mastery, { foreignKey: 'user_id' });

module.exports = { User, Quiz, Question, Option, Attempt, Response, UserMastery: Mastery };
