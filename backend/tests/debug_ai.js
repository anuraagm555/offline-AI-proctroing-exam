const aiService = require('../services/aiService');

async function testAI() {
    try {
        console.log("Testing AI Service...");
        const result = await aiService.generateQuiz("Computer Science");
        console.log("✅ AI Service Success!");
        console.log("Title:", result.title);
        console.log("Questions:", result.questions.length);
    } catch (error) {
        console.error("❌ AI Service Failed:");
        console.error(error.message);
        if (error.cause) console.error("Cause:", error.cause);
    }
}

testAI();
