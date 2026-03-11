const { Quiz, Question, Option, Attempt, Response } = require('./models');
const { sequelize } = require('./config/database');

async function removeDuplicates() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        const quizzes = await Quiz.findAll({ order: [['created_at', 'DESC']] });
        const seenTitles = new Set();
        const toDeleteIds = [];

        for (const q of quizzes) {
            if (seenTitles.has(q.title)) {
                toDeleteIds.push(q.id);
            } else {
                seenTitles.add(q.title);
            }
        }

        console.log(`Found ${toDeleteIds.length} duplicate quizzes.`);

        if (toDeleteIds.length > 0) {
            console.log('Starting deep cleanup...');

            // 1. Find all Questions
            const questions = await Question.findAll({ where: { quiz_id: toDeleteIds } });
            const questionIds = questions.map(q => q.id);
            console.log(`- Found ${questionIds.length} related questions.`);

            // 2. Delete Options
            if (questionIds.length > 0) {
                console.log('- Deleting Options...');
                await Option.destroy({ where: { question_id: questionIds } });

                // 3. Delete Responses (linked to Questions)
                console.log('- Deleting Question Responses...');
                await Response.destroy({ where: { question_id: questionIds } });
            }

            // 4. Delete Attempts (linked to Quizzes)
            console.log('- Deleting Attempts...');
            // Note: This might cascade delete remaining responses if configured, but we did it above just in case.
            await Attempt.destroy({ where: { quiz_id: toDeleteIds } });

            // 5. Delete Questions
            console.log('- Deleting Questions...');
            await Question.destroy({ where: { id: questionIds } });

            // 6. Delete Quizzes
            console.log('- Deleting Quizzes...');
            await Quiz.destroy({ where: { id: toDeleteIds } });

            console.log('SUCCESS: All duplicates removed.');
        } else {
            console.log('No duplicates found.');
        }

    } catch (err) {
        console.error('Cleanup Error:', err);
    } finally {
        process.exit(0);
    }
}

removeDuplicates();
