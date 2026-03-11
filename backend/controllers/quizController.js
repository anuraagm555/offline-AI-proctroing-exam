const { Quiz, Question, Option, User } = require('../models');
const aiService = require('../services/aiService');
const adaptiveEngine = require('../services/adaptiveEngine');

// Create a new Quiz (Admin only)
exports.createQuiz = async (req, res) => {
    try {
        const { title, description, duration_minutes } = req.body;
        const quiz = await Quiz.create({
            title,
            description,
            duration_minutes,
            created_by: req.user.id
        });
        res.status(201).json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error creating quiz', error: error.message });
    }
};

// Add Question with Options to a Quiz (Admin only)
exports.addQuestion = async (req, res) => {
    try {
        const { quiz_id } = req.params;
        const { question_text, options } = req.body; // options is array of { option_text, is_correct }

        const question = await Question.create({
            quiz_id,
            question_text
        });

        if (options && options.length > 0) {
            const optionsData = options.map(opt => ({
                question_id: question.id,
                option_text: opt.option_text,
                is_correct: opt.is_correct
            }));
            await Option.bulkCreate(optionsData);
        }

        res.status(201).json({ message: 'Question added successfully', question });
    } catch (error) {
        res.status(500).json({ message: 'Error adding question', error: error.message });
    }
};

// Update a quiz (Admin only)
exports.updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, duration_minutes } = req.body;

        const quiz = await Quiz.findByPk(id);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (duration_minutes !== undefined) updates.duration_minutes = duration_minutes;

        await quiz.update(updates);
        res.json({ message: 'Quiz updated successfully', quiz });
    } catch (error) {
        res.status(500).json({ message: 'Error updating quiz', error: error.message });
    }
};

// Get all quizzes
exports.getAllQuizzes = async (req, res) => {
    try {
        const quizzes = await Quiz.findAll({
            include: [{ model: User, attributes: ['name'] }]
        });
        res.json(quizzes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quizzes', error: error.message });
    }
};

// Get single quiz with questions (for taking the quiz)
// IMPORTANT: Exclude is_correct flag for options so students can't cheat via API inspection
exports.getQuizById = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findByPk(id, {
            include: [{
                model: Question,
                include: [{
                    model: Option,
                    attributes: ['id', 'option_text'] // Exclude is_correct
                }]
            }]
        });

        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quiz', error: error.message });
    }
};

// Generate AI Quiz
exports.generateQuizFromAI = async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) return res.status(400).json({ message: 'Topic is required' });

        const aiData = await aiService.generateQuiz(topic);
        res.json(aiData);
    } catch (error) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ message: 'AI Generation Failed', error: error.message });
    }
};

// Adaptive Quiz: Get Next Question
exports.getNextAdaptiveQuestion = async (req, res) => {
    try {
        const { id: quizId } = req.params;
        const { attemptId } = req.query; // passed from frontend
        const userId = req.user.id;

        if (!attemptId) return res.status(400).json({ message: 'Attempt ID required' });

        const question = await adaptiveEngine.getNextQuestion(userId, quizId, attemptId);

        if (!question) {
            // No more questions or error
            return res.json({ message: 'Quiz Completed', finished: true });
        }

        // Return question without is_correct flag
        // We need to manually sanitize because the engine returns a raw model instance
        let safeQuestion = question.toJSON();

        if (safeQuestion.Options) {
            safeQuestion.Options = safeQuestion.Options.map(o => ({ id: o.id, option_text: o.option_text }));
        }

        res.json({ finished: false, question: safeQuestion });

    } catch (error) {
        console.error('Adaptive Error:', error);
        res.status(500).json({ message: 'Error fetching next question' });
    }
};
