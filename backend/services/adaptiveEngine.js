const { UserMastery, Question, Option, Attempt, Response } = require('../models');

// Bayesian Knowledge Tracing (BKT) Parameters
const P_INIT = 0.3;     // Initial probability of knowing a concept
const P_TRANSIT = 0.1;  // Probability of learning the concept after an opportunity
const P_SLIP = 0.1;     // Probability of making a mistake despite knowing the concept
const P_GUESS = 0.2;    // Probability of guessing correctly without knowing

/**
 * Update student's mastery of a concept based on their answer.
 * @param {number} userId 
 * @param {string} conceptTag 
 * @param {boolean} isCorrect 
 */
exports.updateMastery = async (userId, conceptTag, isCorrect) => {
    try {
        let mastery = await UserMastery.findOne({ where: { user_id: userId, topic: conceptTag } });

        // P(L_n) - Prior Probability
        let pLearn = mastery ? mastery.mastery_score : P_INIT;

        // P(Correct | L_n)
        // If correct: (L * (1 - Slip)) / (L * (1 - Slip) + (1 - L) * Guess)
        // If incorrect: (L * Slip) / (L * Slip + (1 - L) * (1 - Guess))

        let pPosterior;
        if (isCorrect) {
            const num = pLearn * (1 - P_SLIP);
            const den = num + (1 - pLearn) * P_GUESS;
            pPosterior = num / den;
        } else {
            const num = pLearn * P_SLIP;
            const den = num + (1 - pLearn) * (1 - P_GUESS);
            pPosterior = num / den;
        }

        // P(L_{n+1}) - Update with transition probability
        // P(L_{n+1}) = P(L_n | Evidence) + (1 - P(L_n | Evidence)) * P(Transit)
        let pNext = pPosterior + (1 - pPosterior) * P_TRANSIT;

        // Save new mastery
        if (mastery) {
            mastery.mastery_score = pNext;
            mastery.last_updated = new Date();
            await mastery.save();
        } else {
            await UserMastery.create({
                user_id: userId,
                topic: conceptTag,
                mastery_score: pNext
            });
        }

        console.log(`[BKT] Updated mastery for User ${userId} on '${conceptTag}': ${pLearn.toFixed(2)} -> ${pNext.toFixed(2)}`);
        return pNext;

    } catch (error) {
        console.error('Error updating mastery:', error);
        return null; // Fail gracefully
    }
};

/**
 * Select the next best question for the student.
 * Strategy: Find a question with difficulty matching the student's mastery level
 * (Zone of Proximal Development: ~50% chance of getting it right).
 * @param {number} userId 
 * @param {number} quizId 
 * @param {number} attemptId - To find answered questions
 */
exports.getNextQuestion = async (userId, quizId, attemptId) => {
    try {
        // 1. Get answered question IDs
        const responses = await Response.findAll({ where: { attempt_id: attemptId }, attributes: ['question_id'] });
        const answeredIds = responses.map(r => r.question_id);

        // 2. Get all available questions for this quiz
        const allQuestions = await Question.findAll({
            where: { quiz_id: quizId },
            include: [{ model: Option }]
        });

        // Filter out answered ones
        const availableQuestions = allQuestions.filter(q => !answeredIds.includes(q.id));

        if (availableQuestions.length === 0) return null; // Quiz Complete

        // 3. Determine User's Mastery Level
        // Heuristic: Look at the concept of the first available question to gauge general level
        // Ideally, we'd pick the concept first. Here we assume questions share overlapping concepts or pick generic.
        const concept = availableQuestions[0].concept_tag || 'General';
        const mastery = await UserMastery.findOne({ where: { user_id: userId, topic: concept } });

        let targetDifficulty = 5; // Default medium (1-10)
        if (mastery) {
            // Map mastery (0.0 - 1.0) to difficulty (1 - 10)
            targetDifficulty = Math.ceil(mastery.mastery_score * 10);
            if (targetDifficulty < 1) targetDifficulty = 1;
        }

        // 4. Find closest matching question
        // Sort by ABS(question.difficulty - targetDifficulty)
        availableQuestions.sort((a, b) => {
            const diffA = Math.abs((a.difficulty_level || 5) - targetDifficulty);
            const diffB = Math.abs((b.difficulty_level || 5) - targetDifficulty);
            return diffA - diffB; // Ascending diff
        });

        const bestQuestion = availableQuestions[0];
        console.log(`[Adapter] User Mastery: ${mastery ? mastery.mastery_score.toFixed(2) : 'None'} -> Target Diff: ${targetDifficulty}, Selected Q-ID: ${bestQuestion.id} (Diff: ${bestQuestion.difficulty_level})`);

        return bestQuestion;

    } catch (error) {
        console.error('Error getting next question:', error);
        return null; // Fallback
    }
};
