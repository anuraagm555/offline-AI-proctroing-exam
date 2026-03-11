const axios = require('axios');

const OLLAMA_API = 'http://localhost:11434/api/generate';

exports.getRecommendations = async (history) => {
    // history: [{ question: "...", selected: "...", correct: "...", isCorrect: false, topic: "Physics" }]

    // Filter for mistakes to focus the AI
    const mistakes = history.filter(h => !h.isCorrect).slice(0, 10); // Analyze last 10 mistakes
    const strengths = history.filter(h => h.isCorrect).slice(0, 5);

    const summary = `
    Recent Mistakes:
    ${mistakes.map(m => `- Q: ${m.question} | You Picked: ${m.selected} (Correct: ${m.correct})`).join('\n')}
    
    Verified Strengths:
    ${strengths.map(s => `- ${s.topic || 'General Learning'}`).join(', ')}
    `;

    // Prompt for Deep Analysis
    const prompt = `You are an expert AI Tutor.
    Analyze this student's recent quiz performance:
    ${summary}

    Task: Provide a "Performance Analytics" report and "Smart Suggestions".
    Output: A single valid JSON object.
    
    Structure:
    {
        "analytics": {
            "weakness_analysis": "Brief explanation of *why* they might be making these specific mistakes (concepts to review).",
            "strength_analysis": "Brief praise of what they clearly understand."
        },
        "recommendations": [
            {"topic": "Specific Topic 1", "reason": "Connecting to a specific mistake."},
            {"topic": "Specific Topic 2", "reason": "Building on a strength."}
        ],
        "actionable_tip": "One concrete study tip."
    }
    
    Keep it encouraging but analytical. Max 150 words total.`;

    const tryModel = async (modelName) => {
        return await axios.post(OLLAMA_API, {
            model: modelName,
            prompt: prompt,
            format: "json",
            stream: false,
            options: { temperature: 0.4, num_ctx: 2048 }
        }, { timeout: 90000 });
    };

    try {
        let response;
        try {
            response = await tryModel("phi3");
        } catch (e) {
            console.warn("Phi3 failed, trying phi3:mini...");
            response = await tryModel("phi3:mini");
        }

        let data = response.data.response;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { }
        }
        return data || {};
    } catch (error) {
        console.error("AI Rec Error:", error.message);
        return {
            analytics: { weakness_analysis: "AI Service Busy.", strength_analysis: "Good effort!" },
            recommendations: [{ topic: "Review Basics", reason: "AI unavailable." }],
            actionable_tip: "Ensure Ollama is running."
        };
    }
};

exports.analyzeAttemptPerf = async (history) => {
    // history: array of { question, selected, correct, isCorrect }

    const summary = history.map((h, i) =>
        `Q${i + 1}: ${h.question}\nUser Answer: ${h.selected}\nCorrect Answer: ${h.correct}\nResult: ${h.isCorrect ? 'PASSED' : 'FAILED'}`
    ).join('\n---\n');

    const prompt = `You are a strict Exam Grader.
    Analyze this student's exam attempt:
    
    ${summary}

    Task: Provide a detailed "Exam Report".
    Output: A valid JSON object.
    {
        "score_analysis": "Comment on their overall accuracy.",
        "key_mistakes": ["Explain mistake 1", "Explain mistake 2"],
        "study_focus": "One topic they clearly didn't understand."
    }
    Keep it professional and concise.`;

    const tryModel = async (modelName) => {
        return await axios.post(OLLAMA_API, {
            model: modelName,
            prompt: prompt,
            format: "json",
            stream: false,
            options: { temperature: 0.3, num_ctx: 2048 }
        }, { timeout: 90000 });
    };

    try {
        let response;
        try {
            response = await tryModel("phi3");
        } catch (e) {
            console.warn("Phi3 failed, trying phi3:mini...");
            response = await tryModel("phi3:mini");
        }

        let data = response.data.response;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { }
        }
        return data || {};
    } catch (error) {
        console.error("AI Analysis Error:", error.message);
        return {
            score_analysis: "Great job completing the assessment! (AI Offline)",
            key_mistakes: ["Review any questions you missed."],
            study_focus: "Keep practicing to improve speed."
        };
    }
};

exports.generateQuiz = async (topic) => {
    // Prompt engineered for Phi-3 in JSON mode
    const prompt = `You are a strict JSON generator.
Task: Generate a quiz about "${topic}".
Output: A single valid JSON object.
Structure:
{
    "title": "Creative Title",
    "description": "Short description",
    "questions": [
        {
            "text": "Question text?",
            "options": ["A", "B", "C", "D"],
            "correct_index": 0
        }
    ]
}
Requirements:
- Exactly 10 questions.
- "options" must be 4 strings.
- "correct_index" must be 0-3.`;

    try {

        // 60s timeout for local LLM
        const axiosConfig = {
            timeout: 90000
        };

        console.log(`[AI Service] Requesting quiz for topic: ${topic}...`);
        const response = await axios.post(OLLAMA_API, {
            model: "phi3:mini",
            prompt: prompt,
            format: "json", // FORCE JSON MODE
            stream: false,
            options: {
                temperature: 0.3,
                num_ctx: 4096
            }
        }, axiosConfig);

        let rawResponse = response.data.response.trim();
        console.log("[AI Service] Raw Response Length:", rawResponse.length);

        // Robust Markdown Stripping
        rawResponse = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();

        const firstBrace = rawResponse.indexOf('{');
        const lastBrace = rawResponse.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            rawResponse = rawResponse.substring(firstBrace, lastBrace + 1);
        }

        const data = JSON.parse(rawResponse);
        return data;

    } catch (error) {
        console.error("AI Service Error:", error.message);
        throw new Error("AI Service Unavailable or Timeout");
    }
};
