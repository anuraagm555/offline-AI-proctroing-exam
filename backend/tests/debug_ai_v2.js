const aiService = require('../services/aiService');
const fs = require('fs');

async function testAI() {
    const topic = "History of Rome";
    const LOG_FILE = 'ai_debug.log';

    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(LOG_FILE, msg + '\n');
    };

    try {
        log(`[${new Date().toISOString()}] Starting AI Test for topic: ${topic}`);

        const result = await aiService.generateQuiz(topic);

        log("✅ AI Generation Successful");
        log("Result: " + JSON.stringify(result, null, 2));

    } catch (error) {
        log("❌ AI Generation Failed");
        log("Error: " + error.message);
        if (error.cause) log("Cause: " + JSON.stringify(error.cause));
        if (error.response) log("Response Data: " + JSON.stringify(error.response.data));
    }
}

testAI();
