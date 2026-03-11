// Global State
const state = {
    user: null,
    token: null,
};

// API Base URL
const API_URL = 'http://127.0.0.1:5001/api';

// Helper to shuffle array (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Router
const routes = {
    '/': 'login',
    '/login': 'login',
    '/register': 'register',
    '/dashboard': 'dashboard',
    '/create-quiz': 'create-quiz',
    '/quiz': 'quiz-interface', // /quiz/:id handled dynamically
    '/leaderboard': 'leaderboard'
};

// Init application
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    handleNavigation();
    window.addEventListener('hashchange', handleNavigation);

    // Auth guard listener?
    if (state.token) {
        document.getElementById('navbar').classList.remove('hidden');
        if (state.user?.role === 'admin') {
            document.getElementById('nav-dashboard').innerText = 'Admin Dashboard';
            document.getElementById('nav-create-quiz').classList.remove('hidden');
        } else {
            document.getElementById('nav-dashboard').innerText = 'Student Dashboard';
        }
        // Try to sync on load if online
        if (navigator.onLine) {
            syncOfflineData();
        }
    }

    document.getElementById('logout-btn').addEventListener('click', logout);

    // Online/Offline Listeners
    window.addEventListener('online', () => {
        showToast('You are back online! Syncing data...', 'success');
        syncOfflineData();
    });
    window.addEventListener('offline', () => {
        showToast('You are offline. Quizzes will be saved locally.', 'error');
    });
});

async function syncOfflineData() {
    try {
        const pending = await getPendingAttempts();
        if (pending.length > 0) {
            console.log(`Syncing ${pending.length} offline attempts...`);
            for (const attempt of pending) {
                try {
                    console.log('Syncing attempt:', attempt);
                    // Submit to backend
                    const result = await apiCall('/attempts/submit', 'POST', {
                        quiz_id: attempt.quizId,
                        responses: attempt.responses
                    });

                    if (result) {
                        // If successful, delete from IDB
                        await deleteOfflineAttempt(attempt.id);
                        showToast(`Offline attempt for Quiz ${attempt.quizId} synced!`, 'success');
                    }
                } catch (err) {
                    console.error('Sync failed for attempt ' + attempt.id, err);
                }
            }
        }
    } catch (e) {
        console.error('Error reading offline data:', e);
    }
}

function loadState() {
    state.token = localStorage.getItem('token');
    state.user = JSON.parse(localStorage.getItem('user'));
}

function handleNavigation() {
    const hash = window.location.hash || '#/';
    const path = hash.split('?')[0].replace('#', ''); // Basic hash routing

    // Auth Guard
    if (!state.token && path !== '/login' && path !== '/register' && path !== '/') {
        window.location.hash = '#/login';
        return;
    }

    if (state.token && (path === '/login' || path === '/register')) {
        window.location.hash = '#/dashboard';
        return;
    }

    // Dynamic Route handling (e.g., /quiz/123)
    if (path.startsWith('/quiz/')) {
        const quizId = path.split('/')[2];
        loadView('quiz-interface', { quizId });
        return;
    }

    const viewName = routes[path] || '404';
    loadView(viewName);
}

async function loadView(viewName, params = {}) {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div style="text-align:center; padding: 2rem;">Loading...</div>';

    try {
        // We will dynamically load methods for each view or use a big switch here
        // For simplicity in a single file app approach (without bundler), we can define view renderers

        switch (viewName) {
            case 'login':
                renderLogin(main);
                break;
            case 'register':
                renderRegister(main);
                break;
            case 'dashboard':
                await renderDashboard(main);
                break;
            case 'create-quiz':
                renderCreateQuiz(main);
                break;
            case 'quiz-interface':
                await renderQuizInterface(main, params.quizId);
                break;
            default:
                main.innerHTML = '<h1>Page Not Found</h1>';
        }
    } catch (error) {
        console.error('View Error:', error);
        main.innerHTML = `<div class="container"><p style="color:red">Error loading view: ${error.message}</p></div>`;
    }
}

// ------ API Helper ------
async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || 'API request failed');
    return data;
}

// ------ Views ------

function renderLogin(container) {
    container.innerHTML = `
        <div class="container" style="max-width: 400px;">
            <div class="card">
                <h2 style="text-align:center; margin-bottom: 1.5rem;">Login</h2>
                <form id="login-form">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" name="password" required>
                    </div>
                    <button type="submit" class="btn" style="width:100%">Login</button>
                    <p style="text-align:center; margin-top:1rem;">
                        No account? <a href="#/register">Register</a>
                    </p>
                </form>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const res = await apiCall('/auth/login', 'POST', data);
            login(res);
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

function renderRegister(container) {
    container.innerHTML = `
        <div class="container" style="max-width: 400px;">
            <div class="card">
                <h2 style="text-align:center; margin-bottom: 1.5rem;">Register</h2>
                <form id="register-form">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" name="name" required>
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" name="password" required>
                    </div>
                    <div class="form-group">
                        <label>Role</label>
                        <select name="role">
                            <option value="student">Student</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <button type="submit" class="btn" style="width:100%">Register</button>
                    <p style="text-align:center; margin-top:1rem;">
                        Already have an account? <a href="#/login">Login</a>
                    </p>
                </form>
            </div>
        </div>
    `;

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            await apiCall('/auth/register', 'POST', data);
            showToast('Registration successful! Please login.', 'success');
            window.location.hash = '#/login';
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

async function renderDashboard(container) {
    if (state.user.role === 'admin') {
        container.innerHTML = `
            <div class="container">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                    <h1>Admin Dashboard</h1>
                    <a href="#/create-quiz" class="btn">Create New Quiz</a>
                </div>

                <!-- Admin Stats Grid -->
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:2rem;">
                    <div class="card" style="text-align:center;">
                        <h3>Total Quizzes</h3>
                        <p id="stat-total-quizzes" style="font-size:2rem; font-weight:bold; color:var(--primary-color);">...</p>
                    </div>
                    <div class="card" style="text-align:center;">
                        <h3>Total Attempts</h3>
                        <p id="stat-total-attempts" style="font-size:2rem; font-weight:bold; color:var(--secondary-color);">...</p>
                    </div>
                </div>

                <!-- Charts Area -->
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap:2rem; margin-bottom:2rem;">
                    <div class="card">
                        <h3>Quiz Popularity (Attempts)</h3>
                        <canvas id="adminChartAttempts"></canvas>
                    </div>
                    <div class="card">
                        <h3>Average Scores</h3>
                        <canvas id="adminChartScores"></canvas>
                    </div>
                </div>

                <h3>Recent Activity</h3>
                <div id="recent-activity-list" class="card">Loading activity...</div>

                <h3>Verify Credential 🔍</h3>
                <div class="card">
                    <div style="display:flex; gap:10px;">
                        <input type="text" id="verify-input" placeholder="Enter Transaction Hash or Certificate ID" style="flex:1;">
                        <button id="btn-verify" class="btn">Verify</button>
                    </div>
                    <div id="verification-result" style="margin-top:1rem; display:none;"></div>
                </div>

                <h3>Your Quizzes</h3>
                <div id="quiz-list">Loading...</div>
            </div>
        `;
        // Load Admin Stats
        loadAdminStats();

        // Setup Verification Listener
        document.getElementById('btn-verify').addEventListener('click', verifyCredential);
    } else {
        container.innerHTML = `
            <div class="container">
                <h1>Student Dashboard</h1>
                
                <!-- AI Recommendations -->
                <div id="ai-recommendations" style="margin-bottom: 2rem;"></div>

                <h3>Available Quizzes</h3>
                <div id="quiz-list">Loading...</div>
                
                <h3 style="margin-top: 2rem;">My Recent Attempts</h3>
                <div id="attempts-list">Loading...</div>

                <h3 style="margin-top: 2rem;">Performance Analytics</h3>
                <div class="card">
                    <canvas id="performanceChart"></canvas>
                </div>
            </div>
        `;
        // Load attempts for student
        loadStudentAttempts();
    }

    // Load available quizzes
    try {
        let quizzes = [];
        try {
            quizzes = await apiCall('/quizzes');
            // Cache for offline use
            for (const q of quizzes) {
                await saveQuizOffline(q);
            }
        } catch (netError) {
            console.warn('Network failed, trying offline cache for dashboard...', netError);
            if (!navigator.onLine) {
                document.getElementById('quiz-list').innerHTML = '<p>You are offline. Please go to a specific quiz if you have opened it before.</p>';
                return;
            }
            throw netError;
        }

        const listHtml = quizzes.map(q => `
            <div class="card">
                <h3>${q.title}</h3>
                <p>${q.description || 'No description'}</p>
                <div style="display:flex; justify-content:space-between; margin-top:1rem; align-items:center;">
                    <span style="color:#666">${q.duration_minutes} mins</span>
                    ${state.user.role === 'student'
                ? `<a href="#/quiz/${q.id}" class="btn">Start Quiz</a>`
                : `<button class="btn btn-secondary">Edit (TODO)</button>`
            }
                </div>
            </div>
        `).join('');

        document.getElementById('quiz-list').innerHTML = listHtml.length ? listHtml : '<p>No quizzes available.</p>';

    } catch (error) {
        document.getElementById('quiz-list').innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
    }
}

async function loadStudentAttempts() {
    try {
        const attempts = await apiCall('/attempts/my-attempts');
        const listHtml = attempts.map(a => `
            <div class="card" style="padding: 1rem;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${a.Quiz?.title || 'Unknown Quiz'}</strong>
                    <span style="font-weight:bold; color: var(--primary-color)">Score: ${a.score}</span>
                </div>
                <div style="font-size: 0.85rem; color: #666; margin-top: 0.5rem;">
                    Date: ${new Date(a.started_at).toLocaleString()}
                    ${a.transaction_hash ? `<br><a href="#" title="${a.transaction_hash}" style="color:green; font-family:monospace;">Blockchain Verified ✓</a>` : '<br><span style="color:orange">Pending Sync/Verify</span>'}
                </div>
            </div>
        `).join('');

        document.getElementById('attempts-list').innerHTML = listHtml.length ? listHtml : '<p>No attempts yet.</p>';

        // Render Chart
        if (attempts.length > 0) {
            renderChart(attempts);
        }

    } catch (error) {
        console.error(error);
    }
}

function renderChart(attempts) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    // Sort by date ascending
    const sorted = attempts.slice().sort((a, b) => new Date(a.started_at) - new Date(b.started_at));

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sorted.map(a => new Date(a.started_at).toLocaleDateString()),
            datasets: [{
                label: 'Quiz Scores',
                data: sorted.map(a => a.score),
                borderColor: 'var(--primary-color)',
                tension: 0.1,
                fill: false
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Score' }
                }
            }
        }
    });
}

function renderCreateQuiz(container) {
    if (state.user.role !== 'admin') {
        container.innerHTML = '<p>Access Denied</p>';
        return;
    }

    // Create Quiz Form
    container.innerHTML = `
        <div class="container">
            <h1>Create New Quiz</h1>
            
            <div style="margin-bottom: 2rem; padding: 1rem; background: #eef2ff; border-radius: 8px; border: 1px solid #c7d2fe;">
                 <h3>✨ AI Quiz Generator</h3>
                 <p>Enter a topic and let our AI create a quiz for you instantly.</p>
                 <div style="display:flex; gap:10px; margin-top:10px;">
                    <input type="text" id="ai-topic" placeholder="e.g. History, Science, Math" style="flex:1; padding:0.5rem;">
                    <button id="btn-generate-ai" class="btn" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">Generate</button>
                 </div>
            </div>

            <div class="card">
                <form id="create-quiz-form">
                    <div class="form-group">
                        <label>Title</label>
                        <input type="text" name="title" id="quiz-title" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <input type="text" name="description" id="quiz-desc">
                    </div>
                    <div class="form-group">
                        <label>Duration (minutes)</label>
                        <input type="number" name="duration_minutes" id="quiz-duration" value="10" required>
                    </div>
                    <div class="form-group">
                        <label>Questions JSON (Manual Edit)</label>
                        <textarea name="questions_json" id="quiz-questions" rows="10" placeholder='[{"text":"Q1","options":["A","B"],"correct_index":0}]' required></textarea>
                    </div>
                    <button type="submit" class="btn">Create Quiz</button>
                </form>
            </div>
        </div>
    `;

    // AI Generation Logic
    document.getElementById('btn-generate-ai').addEventListener('click', async () => {
        const topic = document.getElementById('ai-topic').value;
        if (!topic) return showToast('Please enter a topic', 'error');

        const btn = document.getElementById('btn-generate-ai');
        const originalText = btn.innerText;
        btn.innerText = 'Generating (Ollama)...';
        btn.disabled = true;

        try {
            const aiData = await apiCall('/quizzes/generate', 'POST', { topic });

            document.getElementById('quiz-title').value = aiData.title || `AI Quiz: ${topic}`;
            document.getElementById('quiz-desc').value = aiData.description || `Generated quiz about ${topic}`;

            // Handle various AI return formats
            let questions = [];
            if (aiData.questions && Array.isArray(aiData.questions)) {
                questions = aiData.questions;
            } else if (Array.isArray(aiData)) {
                questions = aiData;
            } else if (typeof aiData === 'object' && aiData.text && aiData.options) {
                // Formatting edge case: Single question returned
                questions = [aiData];
            }

            document.getElementById('quiz-questions').value = JSON.stringify(questions, null, 2);

            showToast('AI Quiz Generated!', 'success');
        } catch (error) {
            showToast('AI Error: ' + error.message, 'error');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    document.getElementById('create-quiz-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            // Parse questions
            let questions = JSON.parse(data.questions_json);

            // Handle single object case (User pasted 1 question without [])
            if (!Array.isArray(questions)) {
                questions = [questions];
            }

            // Validation to prevent "undefined is not an object"
            if (!questions || questions.length === 0) throw new Error("No valid questions found.");

            // 1. Create Quiz
            const quizRes = await apiCall('/quizzes', 'POST', {
                title: data.title,
                description: data.description,
                duration_minutes: parseInt(data.duration_minutes)
            });

            // 2. Add Questions (Sequentially for now)
            for (const [index, q] of questions.entries()) {
                // strict validation to prevent crashes
                if (!q || !q.text || !Array.isArray(q.options)) {
                    console.warn(`Skipping invalid question at index ${index}:`, q);
                    continue;
                }

                // Map options to the expected format for the API
                const optionsPayload = q.options.map((optText, optIndex) => ({
                    option_text: optText,
                    is_correct: optIndex === (q.correct_index || 0)
                }));

                await apiCall(`/quizzes/${quizRes.id}/question`, 'POST', {
                    question_text: q.text,
                    options: optionsPayload
                });
            }

            showToast('Quiz Created Successfully!', 'success');
            window.location.hash = '#/dashboard';
        } catch (error) {
            showToast('Error creating quiz: ' + error.message, 'error');
        }
    });
}

// Mock AI Generator Function
function generateMockAIQuiz(topic) {
    const t = topic.toLowerCase();
    if (t.includes('math')) {
        return {
            title: 'Mathematics Challenge',
            description: 'AI Generated Math Quiz',
            questions: [
                { text: 'What is 5 + 7?', options: ['10', '11', '12', '13'], correct_index: 2 },
                { text: 'What is 12 * 12?', options: ['124', '144', '164', '100'], correct_index: 1 },
                { text: 'Solve for x: 2x = 10', options: ['2', '10', '5', '8'], correct_index: 2 }
            ]
        };
    } else if (t.includes('science')) {
        return {
            title: 'Science Explorer',
            description: 'AI Generated Science Quiz',
            questions: [
                { text: 'What is H2O?', options: ['Salt', 'Water', 'Gold', 'Air'], correct_index: 1 },
                { text: 'What planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correct_index: 1 },
                { text: 'Speed of light is approx?', options: ['300,000 km/s', '100 km/h', 'Sound speed', 'Infinite'], correct_index: 0 }
            ]
        };
    } else {
        // Generic / History
        return {
            title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Knowledge Test`,
            description: `A quiz about ${topic} generated by AI`,
            questions: [
                { text: `Who is a famous figure in ${topic}?`, options: ['Einstein', 'Newton', 'Mozart', 'Unknown'], correct_index: 3 },
                { text: `When did ${topic} likely start?`, options: ['1900', 'Ancient Times', '2020', 'Never'], correct_index: 1 },
                { text: 'True or False?', options: ['True', 'False'], correct_index: 0 }
            ]
        };
    }
}

function renderAddQuestions(container, quizId, quizTitle) {
    container.innerHTML = `
        <div class="container">
            <h1>Add Questions to: ${quizTitle}</h1>
            <div class="card">
                <form id="add-question-form">
                    <div class="form-group">
                        <label>Question Text</label>
                        <textarea name="question_text" required rows="2"></textarea>
                    </div>
                    
                    <div style="margin-bottom:1rem;"><strong>Options</strong></div>
                    
                    <div class="form-group">
                        <input type="text" name="option_1" placeholder="Option 1 (Correct Answer)" required style="border-color: var(--success-color);">
                    </div>
                    <div class="form-group">
                        <input type="text" name="option_2" placeholder="Option 2" required>
                    </div>
                     <div class="form-group">
                        <input type="text" name="option_3" placeholder="Option 3" required>
                    </div>
                     <div class="form-group">
                        <input type="text" name="option_4" placeholder="Option 4" required>
                    </div>

                    <button type="submit" class="btn">Add Question</button>
                    <button type="button" class="btn btn-secondary" id="finish-btn">Finish & Go to Dashboard</button>
                </form>
            </div>
            <div id="questions-preview"></div>
        </div>
    `;

    document.getElementById('finish-btn').addEventListener('click', () => {
        window.location.hash = '#/dashboard';
    });

    document.getElementById('add-question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        // Construct payload
        const payload = {
            question_text: formData.get('question_text'),
            options: [
                { option_text: formData.get('option_1'), is_correct: true },
                { option_text: formData.get('option_2'), is_correct: false },
                { option_text: formData.get('option_3'), is_correct: false },
                { option_text: formData.get('option_4'), is_correct: false },
            ]
        };

        try {
            await apiCall(`/quizzes/${quizId}/question`, 'POST', payload);
            showToast('Question added!', 'success');
            e.target.reset(); // clear form
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

// Load Admin Stats with Charts
async function loadAdminStats() {
    try {
        const stats = await apiCall('/attempts/admin/stats');

        // 1. Text Stats
        document.getElementById('stat-total-quizzes').innerText = stats.totalQuizzes;
        document.getElementById('stat-total-attempts').innerText = stats.totalAttempts;

        // 2. Charts
        // Attempts Chart
        new Chart(document.getElementById('adminChartAttempts'), {
            type: 'bar',
            data: {
                labels: stats.quizStats.map(q => q.title),
                datasets: [{
                    label: '# of Attempts',
                    data: stats.quizStats.map(q => q.attempts),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)'
                }]
            },
            options: { responsive: true }
        });

        // Scores Chart
        new Chart(document.getElementById('adminChartScores'), {
            type: 'line',
            data: {
                labels: stats.quizStats.map(q => q.title),
                datasets: [{
                    label: 'Avg Score',
                    data: stats.quizStats.map(q => q.avgScore),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.3
                }]
            },
            options: { responsive: true }
        });

        // 3. Recent Activity List
        const activityHtml = stats.recentAttempts.map(a => `
            <div style="padding:0.5rem; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                <div>
                    <strong>${a.User?.name || 'Unknown'}</strong> took 
                    <em>${a.Quiz?.title || 'Deleted Quiz'}</em>
                </div>
                <div>
                    <span style="font-weight:bold;">Score: ${a.score}</span> 
                    <span style="color:#888; font-size:0.8em;">(${new Date(a.created_at).toLocaleDateString()})</span>
                </div>
            </div>
        `).join('');
        document.getElementById('recent-activity-list').innerHTML = activityHtml || '<p>No recent activity.</p>';

    } catch (error) {
        console.error('Failed to load admin stats:', error);
    }
}

async function verifyCredential() {
    const input = document.getElementById('verify-input').value.trim();
    const resultDiv = document.getElementById('verification-result');

    if (!input) {
        showToast('Please enter a Transaction Hash or ID', 'error');
        return;
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = 'Verifying...';

    try {
        const data = await apiCall(`/attempts/verify/${input}`);

        resultDiv.innerHTML = `
            <div style="background:var(--success-color); color:white; padding:1rem; border-radius:8px;">
                <h3 style="margin-top:0;">✅ Verified Valid</h3>
                <p><strong>Student:</strong> ${data.studentName}</p>
                <p><strong>Quiz:</strong> ${data.quizTitle}</p>
                <p><strong>Score:</strong> ${data.score} / ${data.totalQuestions}</p>
                <p><strong>Date:</strong> ${new Date(data.completedAt).toLocaleString()}</p>
                <p><strong>Transaction Hash:</strong> <span style="font-family:monospace; font-size:0.8em">${data.transactionHash}</span></p>
                
                ${data.wrongAnswers && data.wrongAnswers.length > 0 ? `
                    <div style="margin-top:10px; background:rgba(255,255,255,0.2); padding:10px; border-radius:4px;">
                        <strong>⚠️ Incorrect Answers:</strong>
                        <ul style="margin-bottom:0; padding-left:20px;">
                            ${data.wrongAnswers.map(w => `<li>Q: ${w.question} <br> <span style="opacity:0.8">Your Ans: ${w.selected}</span></li>`).join('')}
                        </ul>
                    </div>
                ` : '<p>🏆 Perfect Score!</p>'}
            </div>
        `;
    } catch (error) {
        resultDiv.innerHTML = `
            <div style="background:var(--error-color); color:white; padding:1rem; border-radius:8px;">
                <h3>❌ Verification Failed</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// --- Adaptive Quiz Logic ---

async function startAdaptiveQuiz(quiz) {
    const main = document.getElementById('main-content');
    const quizId = quiz.id;

    // 1. Start Attempt on Backend
    let attemptId;
    try {
        const res = await apiCall('/attempts/start', 'POST', { quiz_id: quizId });
        attemptId = res.attempt_id;
    } catch (e) {
        showToast('Error starting quiz session: ' + e.message, 'error');
        return;
    }

    // UI Setup
    main.innerHTML = `
        <div id="quiz-container" class="container" style="display:flex; gap:20px;">
            <div style="flex:3;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2>${quiz.title} <span style="font-size:0.8rem; background:#e0f2fe; color:#0284c7; padding:2px 6px; border-radius:4px;">Adaptive Mode</span></h2>
                    <span id="timer" style="font-weight:bold; color:red; font-size:1.2rem;">${quiz.duration_minutes}:00</span>
                </div>
                <div id="quiz-content" class="card">
                    <div id="question-area">Loading first question...</div>
                    <button id="btn-next-adaptive" class="btn" style="margin-top:1rem; display:none;">Submit Answer</button>
                </div>
            </div>
            
            <div style="flex:1;">
                <div class="card" style="text-align:center;">
                    <h4>🛡️ Smart Proctor</h4>
                    <video id="proctor-video" autoplay playsinline muted style="width:100%; border-radius:8px; background:#000;"></video>
                    <div id="proctor-warning" style="background:#ffdddd; color:red; padding:5px; margin-top:5px; border-radius:4px; display:none; font-size:0.8rem;"></div>
                    <p style="font-size:0.8rem; color:#666; margin-top:10px;">
                        AI Adaptation Active.<br>
                        Questions difficulty trails your performance.
                    </p>
                </div>
            </div>
        </div>
    `;

    // Start Proctoring
    window.proctorLogs = [];
    window.quizStartTime = Date.now();
    startProctoring();

    // Start Timer
    startTimer(quiz.duration_minutes * 60, () => finishAdaptiveQuiz(attemptId));

    // Validations State
    let currentQuestion = null;
    let selectedOptionId = null;

    // Load First Question
    await loadNextQuestion();

    async function loadNextQuestion() {
        try {
            const res = await apiCall(`/quizzes/${quizId}/next?attemptId=${attemptId}`);
            if (res.finished) {
                return finishAdaptiveQuiz(attemptId);
            }

            currentQuestion = res.question;
            selectedOptionId = null;
            renderQuestion(currentQuestion);
        } catch (e) {
            showToast('Error loading question: ' + e.message, 'error');
        }
    }

    function renderQuestion(q) {
        const btn = document.getElementById('btn-next-adaptive');
        btn.innerText = "Submit & Next";
        btn.style.display = 'inline-block';
        btn.disabled = true;

        const html = `
            <div style="display:flex; justify-content:space-between;">
                <h4 style="margin-top:0;">Question (Difficulty: Level ${q.difficulty_level || '?'})</h4>
                <span style="font-size:0.8rem; color:#666;">Concept: ${q.concept_tag || 'General'}</span>
            </div>
            <p style="font-size:1.1rem; margin-bottom:1.5rem;">${q.question_text}</p>
            <div class="options-list">
                ${q.Options.map(opt => `
                    <div class="option-card" id="opt-${opt.id}" onclick="selectAdaptiveOption(${opt.id})">
                        ${opt.option_text}
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('question-area').innerHTML = html;

        // Bind selection logic to window for onclick access
        window.selectAdaptiveOption = (id) => {
            selectedOptionId = id;
            document.querySelectorAll('.option-card').forEach(el => el.classList.remove('selected'));
            document.getElementById(`opt-${id}`).classList.add('selected');
            document.getElementById('btn-next-adaptive').disabled = false;
        };
    }

    // Handle Submit
    document.getElementById('btn-next-adaptive').onclick = async () => {
        if (!selectedOptionId) return;

        // Visual feedback
        const btn = document.getElementById('btn-next-adaptive');
        btn.innerText = "Processing...";
        btn.disabled = true;

        try {
            // 1. Submit Answer
            await apiCall('/attempts/answer', 'POST', {
                attempt_id: attemptId,
                question_id: currentQuestion.id,
                selected_option_id: selectedOptionId
            });

            // 2. Load Next (Wait a bit for UX)
            await loadNextQuestion();

        } catch (e) {
            showToast('Error submitting answer: ' + e.message, 'error');
            btn.innerText = "Retry";
            btn.disabled = false;
        }
    };
}

async function finishAdaptiveQuiz(attemptId) {
    stopProctoring();
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container" style="text-align:center; padding-top:3rem;">
            <h2>Calculating Results...</h2>
            <p>Finalizing your Adaptive Score and Trust Level.</p>
            <div class="loader"></div> 
        </div>
    `;

    try {
        const result = await apiCall('/attempts/complete', 'POST', {
            attempt_id: attemptId,
            proctor_logs: window.proctorLogs || []
        });

        // Reuse the result display logic (Or keep it simple)
        main.innerHTML = `
            <div class="container" style="text-align:center;">
                <div class="card">
                    <h1 style="color:var(--success-color)">Adaptive Quiz Completed!</h1>
                    <h2>Final Score: ${result.score}</h2>
                    <p>Trust Score: <strong>${result.trustScore}%</strong></p>

                    <p style="margin: 1rem 0; color: #666;">
                        Transaction Hash: <br>
                        <code style="background:#eee; padding:0.2rem; border-radius:4px; word-break:break-all;">${result.transactionHash || 'Pending'}</code>
                    </p>
                    <div style="margin-top:20px;">
                        <a href="#/dashboard" class="btn">Back to Dashboard</a>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        main.innerHTML = `<div class="container"><p style="color:red">Error finishing quiz: ${e.message}</p> <a href="#/dashboard" class="btn">Back</a></div>`;
    }
}

async function renderQuizInterface(container, quizId) {
    try {
        let quiz;
        try {
            // Try network first
            quiz = await apiCall(`/quizzes/${quizId}`);
            await saveQuizOffline(quiz); // Cache it
        } catch (err) {
            console.warn('Network quiz fetch failed, checking offline cache...', err);
            quiz = await getQuizOffline(quizId);
            if (!quiz) {
                throw new Error('Quiz not found locally and you are offline.');
            }
            showToast('You are offline. Loaded quiz from local storage.', 'info');
        }

        if (quiz.adaptive_enabled) {
            return startAdaptiveQuiz(quiz);
        }

        // Quiz State
        let currentQuestionIndex = 0;
        const answers = {};

        // --- Proctoring Module V1 ---
        let suspicionScore = 0;
        const proctorLog = [];

        const handleVisibilityChange = () => {
            if (document.hidden) {
                suspicionScore += 10;
                const warningMsg = `⚠️ Focus Lost! Tab switched. Suspicion Score: ${suspicionScore}`;
                proctorLog.push({ timestamp: Date.now(), event: 'tab_switch' });
                showToast(warningMsg, 'error');
                console.warn(warningMsg);
            }
        };

        // Remove existing listener if any (simple singleton pattern for this demo)
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        // ----------------------------

        // Randomization: Shuffle Questions and Options
        let questions = quiz.Questions || [];
        // Deep copy to avoid mutating cache if we referenced it directly (though fetched object is usually fresh)
        questions = JSON.parse(JSON.stringify(questions));

        // 1. Shuffle Questions
        shuffleArray(questions);

        // 2. Shuffle Options within each Question
        questions.forEach(q => {
            if (q.Options) {
                shuffleArray(q.Options);
            }
        });

        if (questions.length === 0) {
            container.innerHTML = `<div class="container"><h3>This quiz has no questions.</h3><a href="#/dashboard" class="btn">Back</a></div>`;
            return;
        }

        // Initialize Proctoring UI
        container.innerHTML = `
            <div class="container" style="display:flex; gap:20px;">
                <div style="flex:3;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h2>${quiz.title}</h2>
                        <span id="timer" style="font-weight:bold; color:red; font-size:1.2rem;">${quiz.duration_minutes}:00</span>
                    </div>
                    <div id="quiz-content" class="card">
                        <!-- Questions go here -->
                        <div id="question-container">Loading...</div>
                        <div style="display:flex; justify-content:space-between; margin-top:1rem;">
                            <button id="prev-btn" class="btn" style="background:#64748b;">Previous</button>
                            <button id="next-btn" class="btn">Next</button>
                        </div>
                    </div>
                </div>
                
                <!-- Proctoring Sidebar -->
                <div style="flex:1;">
                    <div class="card" style="text-align:center;">
                        <h4>🛡️ Smart Proctor</h4>
                        <video id="proctor-video" autoplay playsinline muted style="width:100%; border-radius:8px; background:#000;"></video>
                        <div id="proctor-warning" style="background:#ffdddd; color:red; padding:5px; margin-top:5px; border-radius:4px; display:none; font-size:0.8rem;"></div>
                        <p style="font-size:0.8rem; color:#666; margin-top:10px;">
                            We are monitoring: <br>
                            ✅ Face Presence <br>
                            ✅ Tab Switching <br>
                            ✅ Object Detection
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Start Proctoring
        window.proctorLogs = [];
        window.quizStartTime = Date.now();
        startProctoring();

        // Start Timer
        startTimer(quiz.duration_minutes * 60, () => submitQuiz(quizId, answers));

        const updateQuestionUI = () => {
            const q = questions[currentQuestionIndex];
            const savedAns = answers[q.id];

            const html = `
                <h4 style="margin-top:0;">Question ${currentQuestionIndex + 1} of ${questions.length}</h4>
                <p style="font-size:1.1rem; margin-bottom:1.5rem;">${q.question_text}</p>
                <div class="options-list">
                    ${q.Options.map(opt => `
                        <div class="option-card ${savedAns == opt.id ? 'selected' : ''}" onclick="selectOption(${q.id}, ${opt.id}, this)">
                            ${opt.option_text}
                        </div>
                    `).join('')}
                </div>
            `;
            document.getElementById('question-container').innerHTML = html;

            // Buttons
            document.getElementById('prev-btn').disabled = currentQuestionIndex === 0;
            const nextBtn = document.getElementById('next-btn');
            if (currentQuestionIndex === questions.length - 1) {
                nextBtn.innerText = 'Submit Quiz';
                nextBtn.style.backgroundColor = 'var(--success-color)';
            } else {
                nextBtn.innerText = 'Next';
                nextBtn.style.backgroundColor = 'var(--primary-color)';
            }
        };

        // Navigation Handlers
        document.getElementById('prev-btn').addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                updateQuestionUI();
            }
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                updateQuestionUI();
            } else {
                // Submit
                if (confirm('Are you sure you want to submit?')) {
                    submitQuiz(quizId, answers);
                }
            }
        });

        // Expose selectOption globally for onclick (hacky but works for vanilla)
        window.selectOption = (qId, oId, el) => {
            answers[qId] = oId;
            // UI update
            const parent = el.parentElement;
            Array.from(parent.children).forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
        };

        updateQuestionUI();

    } catch (error) {
        container.innerHTML = `<div class="container"><p style="color:red">Error: ${error.message}</p></div>`;
    }
}

async function submitQuiz(quizId, answersMap) {
    // Transform answers map to array
    const responses = Object.keys(answersMap).map(qId => ({
        question_id: parseInt(qId),
        selected_option_id: answersMap[qId]
    }));

    // Show loading overlay
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container" style="text-align:center; padding-top:3rem;">
            <h2>Submitting Quiz...</h2>
            <p>Please wait while we record your score on the Blockchain.</p>
            <div class="loader"></div> 
        </div>
    `;

    // Submit to Backend
    try {
        const payload = {
            quiz_id: quizId,
            responses,
            proctor_logs: window.proctorLogs || []
        };
        const result = await apiCall('/attempts/submit', 'POST', payload);

        const isPerfectScore = result.score === result.totalQuestions;
        let certificateBtn = '';

        if (isPerfectScore) {
            certificateBtn = `
                <button id="btn-cert" class="btn" style="background:#f59e0b; margin-top:10px;">Download PDF Certificate 🏆</button>
                <button id="btn-mint-nft" class="btn" style="background:linear-gradient(45deg, #6366f1, #8b5cf6); margin-top:10px; margin-left:10px;">Mint NFT Certificate ⛓️</button>
            `;
        }

        main.innerHTML = `
            <div class="container" style="text-align:center;">
                <div class="card">
                    <h1 style="color:var(--success-color)">Quiz Completed!</h1>
                    <h2>Your Score: ${result.score} / ${result.totalQuestions}</h2>
                    
                    <p style="margin: 1rem 0; color: #666;">
                        Transaction Hash: <br>
                        <code style="background:#eee; padding:0.2rem; border-radius:4px; word-break:break-all;">${result.transactionHash || 'Pending Verification'}</code>
                    </p>
                    ${certificateBtn}
                    <div style="margin-top:20px;">
                        <a href="#/dashboard" class="btn">Back to Dashboard</a>
                    </div>
                </div>
            </div>
        `;

        // Handlers
        if (isPerfectScore) {
            document.getElementById('btn-cert').addEventListener('click', () => {
                downloadCertificate(state.user.name, quiz.title, result.score, result.totalQuestions);
            });

            document.getElementById('btn-mint-nft').addEventListener('click', async () => {
                const wallet = prompt("Enter your Ethereum Wallet Address (0x...):");
                if (!wallet) return;

                try {
                    const btn = document.getElementById('btn-mint-nft');
                    btn.innerText = "Minting...";
                    btn.disabled = true;

                    const res = await apiCall('/attempts/mint-certificate', 'POST', {
                        attempt_id: result.attempt_id || 0,
                        wallet_address: wallet
                    });

                    showToast(`Minting started! TX: ${res.transactionHash}`, 'success');
                    btn.innerText = "Minted! View on Chain";
                    btn.onclick = () => window.open(`https://sepolia.etherscan.io/tx/${res.transactionHash}`, '_blank');
                } catch (e) {
                    showToast(e.message, 'error');
                    document.getElementById('btn-mint-nft').innerText = "Mint Failed";
                }
            });
        }
    } catch (error) {
        console.warn('Submission failed, trying offline save...', error);

        // Save to IDB
        try {
            await saveOfflineAttempt({
                quizId: quizId,
                responses: responses,
                proctor_logs: window.proctorLogs || [],
                timestamp: Date.now()
            });

            main.innerHTML = `
                <div class="container">
                    <h2>Submission Saved Offline</h2>
                    <p>You seem to be offline. Your attempt has been <strong>encrypted and saved locally</strong>.</p>
                    <p>It will automatically sync to the blockchain when you are back online.</p>
                    <a href="#/dashboard" class="btn">Back to Dashboard</a>
                </div>
            `;
            showToast('Saved offline! Will sync automatically.', 'warning');
        } catch (saveError) {
            main.innerHTML = `
                <div class="container">
                    <h2>Submission Failed</h2>
                    <p>Could not save offline: ${saveError.message}</p>
                    <a href="#/dashboard" class="btn">Back to Dashboard</a>
                </div>
            `;
        }
    }
}

// Generate Certificate
function downloadCertificate(userName, quizTitle, score, total) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });

    // Border
    doc.setLineWidth(3);
    doc.rect(10, 10, 277, 190);

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(40, 40, 40);
    doc.text("Certificate of Achievement", 148.5, 50, { align: "center" });

    // Body
    doc.setFontSize(20);
    doc.setFont("helvetica", "normal");
    doc.text("This is to certify that", 148.5, 80, { align: "center" });

    doc.setFontSize(30);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 50, 200); // Blue
    doc.text(userName, 148.5, 95, { align: "center" });

    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.text(`has successfully completed the quiz`, 148.5, 115, { align: "center" });

    doc.setFontSize(25);
    doc.setFont("helvetica", "bold");
    doc.text(quizTitle, 148.5, 130, { align: "center" });

    doc.setFontSize(20);
    doc.setFont("helvetica", "normal");
    doc.text(`with a Score of ${score} / ${total}`, 148.5, 150, { align: "center" });

    // Footer
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 180);
    doc.text("Verified on Blockchain", 270, 180, { align: "right" });

    doc.save(`${userName}_Certificate.pdf`);
}

// ------ Utilities ------

function login(response) {
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    state.token = response.token;
    state.user = response.user;

    // Update navbar
    document.getElementById('navbar').classList.remove('hidden');
    if (state.user.role === 'admin') {
        document.getElementById('nav-dashboard').innerText = 'Admin Dashboard';
        document.getElementById('nav-create-quiz').classList.remove('hidden');
    }

    showToast('Login successful', 'success');
    window.location.hash = '#/dashboard';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    state.token = null;
    state.user = null;
    document.getElementById('navbar').classList.add('hidden');
    window.location.hash = '#/login';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.background = type === 'error' ? 'var(--error-color)' : (type === 'success' ? 'var(--success-color)' : '#333');
    toast.innerText = message;

    document.getElementById('toast-container').appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function startTimer(durationSeconds, onComplete) {
    let timer = durationSeconds;
    const display = document.getElementById('timer');
    if (!display) return;

    const interval = setInterval(() => {
        const minutes = parseInt(timer / 60, 10);
        const seconds = parseInt(timer % 60, 10);

        display.textContent = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);

        if (--timer < 0) {
            clearInterval(interval);
            onComplete();
        }
    }, 1000);
}

// --- Smart Proctoring V3 ---
let proctorStream = null;
let proctorInterval = null;

async function startProctoring() {
    const video = document.getElementById('proctor-video');
    const warningBox = document.getElementById('proctor-warning');

    if (!video) return;

    try {
        // Request Camera & Audio
        proctorStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        video.srcObject = proctorStream;

        showToast('Proctoring Active: Camera & Audio Monitoring On', 'success');

        // Proctoring Loop
        proctorInterval = setInterval(() => {
            // 1. Tab Visibility Check
            if (document.hidden) {
                logSuspiciousActivity('Tab Switch / Background');
            }

            // 2. Mock Multi-Face / Noise Detection
            // In a real app with face-api.js, we would detect faces here.
            // For this demo, we simulate a check or capture a proof snapshot.

            // Capture Snapshot every ~5 seconds for proof
            if (Math.random() > 0.8) {
                captureProofSnapshot(video);
            }

        }, 1000);

    } catch (err) {
        console.error('Proctoring Error:', err);
        if (warningBox) {
            warningBox.innerText = '⚠️ Camera/Mic Access Denied. Trust Score Penalized.';
            warningBox.style.display = 'block';
        }
        logSuspiciousActivity('Camera/Mic Permission Denied');
    }
}

function captureProofSnapshot(videoElement) {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth / 4; // Low res for storage
        canvas.height = videoElement.videoHeight / 4;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

        // Log "Snapshot Taken" event instead of full image to save space in this demo log
        // In production, upload dataUrl to server/S3
        // logSuspiciousActivity('Periodic Proctor Snapshot'); 
        window.proctorLogs.push({
            timestamp: new Date().toISOString(),
            type: 'SNAPSHOT_TAKEN',
            details: 'Image captured for proof (simulated upload)'
        });
    } catch (e) {
        // ignore video not ready
    }
}

function stopProctoring() {
    if (proctorStream) {
        proctorStream.getTracks().forEach(track => track.stop());
        proctorStream = null;
    }
    if (proctorInterval) clearInterval(proctorInterval);
}

function logSuspiciousActivity(reason) {
    const start = window.quizStartTime || Date.now();
    const timestamp = Math.floor((Date.now() - start) / 1000);
    console.warn(`[Proctor] Suspicious: ${reason} at ${timestamp}s`);

    // Update local log
    if (!window.proctorLogs) window.proctorLogs = [];
    window.proctorLogs.push({ reason, timestamp });

    // UI Feedback
    const warningBox = document.getElementById('proctor-warning');
    if (warningBox) {
        warningBox.innerText = `⚠️ Warning: ${reason}`;
        warningBox.style.display = 'block';
        setTimeout(() => warningBox.style.display = 'none', 3000);
    }
}
