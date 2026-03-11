const { User } = require('./models');
const { connectDB } = require('./config/database');
const bcrypt = require('bcryptjs');

const seed = async () => {
    try {
        await connectDB(true); // Forced Sync = True (Wipe Data)

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash('password123', salt);

        // 1. Create Admin
        const existingAdmin = await User.findOne({ where: { email: 'admin@example.com' } });
        if (!existingAdmin) {
            await User.create({
                name: 'Admin User',
                email: 'admin@example.com',
                password_hash: password_hash,
                role: 'admin'
            });
            console.log('Default Admin User Created:');
            console.log('Email: admin@example.com');
            console.log('Password: password123');
        } else {
            console.log('Admin already exists');
            console.log('Default Admin User Verified');
            console.log('Email: admin@example.com');
            console.log('Password: password123');
        }

        // 2. Create Student
        const existingStudent = await User.findOne({ where: { email: 'student@example.com' } });
        if (!existingStudent) {
            await User.create({
                name: 'Student User',
                email: 'student@example.com',
                password_hash: password_hash,
                role: 'student'
            });
            console.log('Default Student User Created:');
            console.log('Email: student@example.com');
            console.log('Password: password123');
        } else {
            console.log('Student already exists');
        }

        // 3. Create Sample Quiz with Adaptive Questions
        const adminUser = await User.findOne({ where: { email: 'admin@example.com' } });
        const existingQuiz = await require('./models').Quiz.findOne({ where: { title: 'Adaptive Demo Quiz' } });

        if (!existingQuiz && adminUser) {
            const quiz = await require('./models').Quiz.create({
                title: 'Adaptive Demo Quiz',
                description: 'A sample quiz to test BKT and Proctoring.',
                duration_minutes: 10,
                created_by: adminUser.id,
                difficulty_level: 5,
                adaptive_enabled: true
            });

            // Add Questions
            const questions = [
                {
                    text: 'What is 2 + 2?', diff: 1, concept: 'Arithmetic',
                    opts: [{ t: '4', c: true }, { t: '3', c: false }, { t: '5', c: false }, { t: '22', c: false }]
                },
                {
                    text: 'What is the capital of France?', diff: 3, concept: 'Geography',
                    opts: [{ t: 'Paris', c: true }, { t: 'Berlin', c: false }, { t: 'Madrid', c: false }, { t: 'Rome', c: false }]
                },
                {
                    text: 'Solve for x: 2x + 5 = 15', diff: 5, concept: 'Algebra',
                    opts: [{ t: '5', c: true }, { t: '10', c: false }, { t: '2.5', c: false }, { t: '7', c: false }]
                },
                {
                    text: 'What is the derivative of x^2?', diff: 7, concept: 'Calculus',
                    opts: [{ t: '2x', c: true }, { t: 'x', c: false }, { t: '2', c: false }, { t: 'x^2', c: false }]
                },
                {
                    text: 'What is the time complexity of QuickSort (avg)?', diff: 9, concept: 'CS Theory',
                    opts: [{ t: 'O(n log n)', c: true }, { t: 'O(n^2)', c: false }, { t: 'O(n)', c: false }, { t: 'O(1)', c: false }]
                }
            ];

            const { Question, Option } = require('./models');
            for (const q of questions) {
                const newQ = await Question.create({
                    quiz_id: quiz.id,
                    question_text: q.text,
                    difficulty_level: q.diff,
                    concept_tag: q.concept
                });

                await Option.bulkCreate(q.opts.map(o => ({
                    question_id: newQ.id,
                    option_text: o.t,
                    is_correct: o.c
                })));
            }
            console.log('Sample Quiz "Adaptive Demo Quiz" Created with 5 Questions.');
        } else {
            console.log('Sample Quiz already exists.');
        }

    } catch (error) {
        console.error('Seed Error:', error);
    }
};

seed();
