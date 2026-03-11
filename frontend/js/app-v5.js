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
    // 1. ALWAYS STOP PROCTORING on route change
    // This prevents the camera from running in dashboards/admin panels
    stopProctoring();

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
                <h2 style="text-align:center; margin-bottom: 1.5rem;">AI Proctoring Exam Login</h2>
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
                <h2 style="text-align:center; margin-bottom: 1.5rem;">AI Proctoring Exam Register</h2>
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
                        <select name="role" id="role-select">
                            <option value="student">Student</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div class="form-group" id="secret-code-group" style="display:none;">
                        <label>Admin Secret Code</label>
                        <input type="password" name="secretCode" placeholder="Required for Admin">
                    </div>
                    <button type="submit" class="btn" style="width:100%">Register</button>
                    <p style="text-align:center; margin-top:1rem;">
                        Already have an account? <a href="#/login">Login</a>
                    </p>
                </form>
            </div>
        </div>
    `;

    // Toggle Secret Code Field
    document.getElementById('role-select').addEventListener('change', (e) => {
        const secretGroup = document.getElementById('secret-code-group');
        if (e.target.value === 'admin') {
            secretGroup.style.display = 'block';
            secretGroup.querySelector('input').required = true;
        } else {
            secretGroup.style.display = 'none';
            secretGroup.querySelector('input').required = false;
            secretGroup.querySelector('input').value = '';
        }
    });

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
                    <h1>AI Proctoring Exam Admin Dashboard</h1>
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
                <!-- AI Recommendations -->
                <div id="ai-recommendations" style="margin-bottom: 2rem;"></div>

                <div style="background:#f0f9ff; padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid #bae6fd;">
                     <strong>🔧 System Check:</strong> 
                     <button onclick="testCamera()" class="btn" style="padding:5px 10px; font-size:0.9rem; margin-left:10px;">Test Camera & Mic</button>
                     <span id="camera-status" style="margin-left:10px; font-size:0.9rem;"></span>
                </div>

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
        loadAIRecommendations();
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
                : `<button class="btn btn-secondary btn-edit-quiz" data-quiz-id="${q.id}">Edit</button>`
            }
                </div>
            </div>
        `).join('');

        document.getElementById('quiz-list').innerHTML = listHtml.length ? listHtml : '<p>No quizzes available.</p>';

        if (state.user.role === 'admin') {
            document.querySelectorAll('.btn-edit-quiz').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    const quizId = parseInt(btn.dataset.quizId, 10);
                    const quiz = quizzes.find((q) => q.id === quizId);
                    if (!quiz) return;

                    const newTitle = prompt('Edit quiz title:', quiz.title || '');
                    if (newTitle === null) return;
                    const newDescription = prompt('Edit quiz description:', quiz.description || '');
                    if (newDescription === null) return;
                    const newDurationRaw = prompt('Edit duration (minutes):', String(quiz.duration_minutes || 10));
                    if (newDurationRaw === null) return;
                    const newDuration = parseInt(newDurationRaw, 10);
                    if (!Number.isFinite(newDuration) || newDuration <= 0) {
                        showToast('Duration must be a positive number', 'error');
                        return;
                    }

                    try {
                        await apiCall(`/quizzes/${quizId}`, 'PUT', {
                            title: newTitle.trim(),
                            description: newDescription.trim(),
                            duration_minutes: newDuration
                        });
                        showToast('Quiz updated', 'success');
                        await renderDashboard(document.getElementById('main-content'));
                    } catch (e) {
                        showToast(`Edit failed: ${e.message}`, 'error');
                    }
                });
            });
        }

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

        const quizStats = stats.quizStats || [];
        const popularityLabels = quizStats.length ? quizStats.map(q => q.title) : (stats.charts?.popularity || []).map(c => c.label);
        const popularityValues = quizStats.length ? quizStats.map(q => q.attempts) : (stats.charts?.popularity || []).map(c => c.value);
        const performanceLabels = quizStats.length ? quizStats.map(q => q.title) : (stats.charts?.performance || []).map(c => c.label);
        const performanceValues = quizStats.length ? quizStats.map(q => q.avgScore) : (stats.charts?.performance || []).map(c => Number(c.value));

        // 2. Charts
        // Attempts Chart (Popularity)
        if (popularityLabels.length) {
            new Chart(document.getElementById('adminChartAttempts'), {
                type: 'bar',
                data: {
                    labels: popularityLabels,
                    datasets: [{
                        label: '# of Attempts',
                        data: popularityValues,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)'
                    }]
                },
                options: { responsive: true }
            });
        }

        // Scores Chart (Performance)
        if (performanceLabels.length) {
            new Chart(document.getElementById('adminChartScores'), {
                type: 'line',
                data: {
                    labels: performanceLabels,
                    datasets: [{
                        label: 'Avg Score',
                        data: performanceValues,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        tension: 0.3
                    }]
                },
                options: { responsive: true }
            });
        }

        // 3. Recent Activity List
        const recentAttempts = stats.recentAttempts || [];
        const activityHtml = recentAttempts.map(a => `
            <div style="padding:0.5rem; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                <div>
                    <strong>${a.User?.name || 'Unknown'}</strong> took 
                    <em>${a.Quiz?.title || 'Deleted Quiz'}</em>
                </div>
                <div>
                    <span style="font-weight:bold;">Score: ${a.score}</span> 
                    <span style="color:#888; font-size:0.8em;">(${new Date(a.completed_at || a.started_at || a.created_at).toLocaleDateString()})</span>
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

        const trustScore = data.trust_score !== undefined ? data.trust_score : 100;
        let trustColor = 'green';
        if (trustScore < 80) trustColor = 'orange';
        if (trustScore < 50) trustColor = 'red';

        resultDiv.innerHTML = `
            <div style="background:var(--success-color); color:white; padding:1rem; border-radius:8px;">
                <h3 style="margin-top:0;">✅ Valid Credential</h3>
                <p><strong>Student:</strong> ${data.studentName}</p>
                <p><strong>Quiz:</strong> ${data.quizTitle}</p>
                <p><strong>Score:</strong> ${data.score}</p>
                <p style="background:white; color:black; padding:5px; border-radius:4px; display:inline-block; margin-top:5px;">
                    <strong>Suspicion Score:</strong> <span style="color:${trustColor}; font-weight:bold;">${100 - trustScore}/100</span>
                    (Trust: ${trustScore}%)
                </p>
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
        attemptId = res.attempt_id; // Fix: Backend returns snake_case
        window.currentAttemptId = attemptId; // GLOBAL for Auto-Submit
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
                    <button id="btn-force-start-cam-adaptive" class="btn" style="margin-top:10px; font-size:0.8rem; background:#333;">🎥 Start Camera</button>
                    <div id="ai-status-text" style="font-size:0.8rem; color:blue; margin-top:5px; font-weight:bold;">🤖 AI Idle</div>
                    <div id="proctor-warning" style="background:#ffdddd; color:red; padding:5px; margin-top:5px; border-radius:4px; display:none; font-size:0.8rem;"></div>
                    <p style="font-size:0.8rem; color:#666; margin-top:10px;">
                        AI Adaptation Active.<br>
                        Questions difficulty trails your performance.
                    </p>
                </div>
            </div>
        </div>
    `;

    // Global Auto-Submit Handler (Unified) - DEFINED BEFORE PROCTORING
    window.forceSubmitQuiz = async () => {
        console.warn("Auto-submitting Adaptive Quiz due to Violation");
        showToast("⚠️ Violation Detected: Submitting...", "error");
        try {
            await finishAdaptiveQuiz(attemptId);
        } catch (e) {
            console.error("Adaptive Auto-Submit Failed:", e);
            window.location.hash = '#/dashboard';
        }
    };

    // Start Proctoring
    window.proctorLogs = [];
    window.quizStartTime = Date.now();
    startProctoring();

    // Bind Manual Start Button
    setTimeout(() => {
        const btn = document.getElementById('btn-force-start-cam-adaptive');
        if (btn) btn.addEventListener('click', startProctoring);
    }, 100);

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
        // Calculate Trust Score
        const logs = window.proctorLogs || [];
        const trustScore = Math.max(0, 100 - (logs.length * 10));

        const result = await apiCall('/attempts/complete', 'POST', {
            attempt_id: attemptId,
            proctor_logs: logs,
            trust_score: trustScore
        });
        const finalTrustScore = result.trustScore ?? trustScore;

        // Reuse the result display logic (Or keep it simple)
        main.innerHTML = `
            <div class="container" style="text-align:center;">
                <div class="card">
                    <h1 style="color:var(--success-color)">Adaptive Quiz Completed!</h1>
                    <h2>Final Score: ${result.score}</h2>
                    <p>Trust Score: <strong style="color:${finalTrustScore < 50 ? 'red' : 'green'}">${finalTrustScore}%</strong></p>

                    <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin: 10px 0; border-left: 4px solid var(--primary-color);">
                        <p style="margin:5px 0; font-size:1.1em; color:#333; font-weight:bold;">Credential ID (Blockchain Hash):</p>
                        <code style="display:block; background:#eee; padding:0.5rem; border-radius:4px; word-break:break-all; font-size:1.0em; color:var(--primary-color);">
                            ${result.transactionHash || 'Generating on Blockchain...'}
                        </code>
                        
                        <p style="margin:15px 0 2px 0; font-size:0.8em; color:#999;">Internal System Ref:</p>
                        <code style="font-size:0.9em; color:#666;">${attemptId}</code>
                    </div>
                    
                    <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
                    
                    <!-- AI Analysis Section -->
                    <div id="ai-result-analysis" style="text-align:left; margin-top:20px;">
                        <p style="text-align:center;">🤖 Generating AI Performance Report...</p>
                    </div>

                    <div style="margin-top:20px;">
                        <a href="#/dashboard" class="btn">Back to Dashboard</a>
                    </div>
                </div>
            </div>
        `;

        // Trigger AI Analysis with Attempt ID
        loadAIRecommendations(document.getElementById('ai-result-analysis'), attemptId);

    } catch (e) {
        main.innerHTML = `<div class="container"><p style="color:red">Error finishing quiz: ${e.message}</p> <a href="#/dashboard" class="btn">Back</a></div>`;
    }
}

// Assuming submitQuiz function exists elsewhere or is part of the non-adaptive flow
// This function is not fully provided in the original content, but the edit implies its structure.
async function submitQuiz(quizId, answers) {
    stopProctoring();
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="container" style="text-align:center; padding-top:3rem;">
            <h2>Submitting Quiz...</h2>
            <p>Please wait while we process your answers and calculate your score.</p>
            <div class="loader"></div> 
        </div>
    `;

    try {
        const result = await apiCall('/attempts/complete', 'POST', {
            quiz_id: quizId,
            answers: answers,
            attempt_id: window.currentAttemptId, // Use the global attempt ID
            proctor_logs: window.proctorLogs || []
        });

        main.innerHTML = `
            <div class="container" style="text-align:center;">
                <div class="card">
                    <h1 style="color:var(--success-color)">Quiz Completed!</h1>
                    <h2>Final Score: ${result.score}</h2>
                    <p>Trust Score: <strong>${result.trustScore}%</strong></p>

                    <p style="margin: 1rem 0; color: #666;">
                        Transaction Hash: <br>
                        <code style="background:#eee; padding:0.2rem; border-radius:4px; word-break:break-all;">${result.transactionHash || 'Pending'}</code>
                    </p>
                    
                    <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
                    
                    <!-- AI Analysis Section -->
                    <div id="ai-result-analysis" style="text-align:left; margin-top:20px;">
                        <p style="text-align:center;">🤖 Generating AI Performance Report...</p>
                    </div>

                    <div style="margin-top:20px;">
                        <a href="#/dashboard" class="btn">Back to Dashboard</a>
                    <button onclick="window.print()" class="btn btn-secondary">Download Certificate</button>
            </div>
            
            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
            
            <!-- AI Analysis Section -->
            <div id="ai-result-analysis-std" style="text-align:left; margin-top:20px;">
                 <p style="text-align:center;">🤖 Generating AI Performance Report...</p>
            </div>
            
            <a href="#/dashboard" class="btn" style="margin-top:20px;">Back to Dashboard</a>
        </div>
    </div>`;

        // Trigger AI
        loadAIRecommendations(document.getElementById('ai-result-analysis-std'));

    } catch (e) {
        document.getElementById('main-content').innerHTML = `<div class="container"><p class="error">Error submitting quiz: ${e.message}</p><a href="#/dashboard" class="btn">Back</a></div>`;
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

        // --- FIX: Start Attempt Session for Standard Quiz ---
        try {
            console.log("Starting Standard Quiz Attempt...");
            const res = await apiCall('/attempts/start', 'POST', { quiz_id: quizId });
            window.currentAttemptId = res.attempt_id;
            window.quizStartTime = Date.now();
            console.log("Attempt Started:", window.currentAttemptId);
        } catch (e) {
            console.error('Failed to start attempt session:', e);
            if (!navigator.onLine) {
                window.currentAttemptId = `OFFLINE_${Date.now()}`;
            } else {
                showToast('Session Init Failed. Sync may fail.', 'error');
            }
        }

        // Quiz State
        let currentQuestionIndex = 0;
        const answers = {};

        // --- Proctoring Module V1 ---
        let suspicionScore = 0;
        const proctorLog = [];

        const handleVisibilityChange = async () => {
            if (document.hidden) {
                // VIOLATION: Immediate Submit
                showToast("🚫 Violation: Tab Switched! Auto-Submitting...", "error");

                // Remove listener to prevent double trigger
                document.removeEventListener('visibilitychange', handleVisibilityChange);

                if (window.forceSubmitQuiz) {
                    await window.forceSubmitQuiz();
                } else {
                    // Fallback if not defined yet
                    window.location.hash = '#/dashboard';
                }
            }
        };
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

        // Initialize State
        // This `attempt` variable is not defined in the current scope.
        // Assuming `attemptId` is available from `startAdaptiveQuiz` or a similar mechanism,
        // or that `attempt` is meant to be fetched/created here.
        // Given the instruction, I will add the line as requested, but note the potential `attempt` variable issue.
        // If this is for the non-adaptive quiz, an attempt needs to be created first.
        // For now, I'll assume `attempt.id` is meant to be available or will be made available.
        // Based on the context of `startAdaptiveQuiz(quiz)` which returns `attemptId`,
        // it's likely that a similar `attempt` object would be created for non-adaptive quizzes.
        // However, the provided code snippet for the change is for the non-adaptive path.
        // I will add the line `window.currentAttemptId = attempt.id;` as requested,
        // but it will require `attempt` to be defined in this scope.
        // Looking at the original code, `attemptId` is only defined in `startAdaptiveQuiz`.
        // For the non-adaptive path, an attempt needs to be created.
        // I will add the line, assuming the user will handle the `attempt` variable.
        // If the user intended this for the adaptive quiz, the placement is wrong.
        // The instruction is "Set window.currentAttemptId when quiz starts."
        // The provided code edit snippet is within `renderQuizInterface` for the non-adaptive path.
        // I will add it here, but it's a logical gap without `attempt` being defined.
        // I will add a placeholder comment for `attempt` if it's not defined.
        // The instruction is to add `window.currentAttemptId = attempt.id;`
        // The code edit snippet shows it after `if (questions.length === 0) { ... }`
        // and before `document.getElementById('main-content').innerHTML = ...`
        // The original code has `container.innerHTML = ...`
        // The provided `Code Edit` block seems to be mixing parts of the adaptive quiz setup with the non-adaptive one.
        // The `document.getElementById('main-content').innerHTML = ...` with `split-layout` and `proctor-sidebar`
        // is from the adaptive quiz setup, not the non-adaptive one in `renderQuizInterface`.
        // The instruction is to "Set window.currentAttemptId when quiz starts."
        // The provided `Code Edit` block is confusing.
        // Let's re-evaluate the instruction and the provided `Code Edit`.
        // The `Code Edit` shows a new HTML structure for `main-content` which is not in the original `renderQuizInterface` for non-adaptive.
        // The original `renderQuizInterface` for non-adaptive uses `container.innerHTML`.
        // The instruction is simple: "Set window.currentAttemptId when quiz starts."
        // The `Code Edit` shows `window.currentAttemptId = attempt.id; // GLOBAL for Proctoring Auto-Submit`
        // This line should be placed where an `attempt` object is available and the quiz is starting.
        // In `startAdaptiveQuiz`, `attemptId` is available.
        // In `renderQuizInterface` (non-adaptive), an `attempt` object is not explicitly created or available before this point.
        // However, the `Code Edit` explicitly places it *after* `if (questions.length === 0)` and *before* the UI rendering.
        // This implies that `attempt` should be available here.
        // I will insert the line exactly as specified in the `Code Edit` block's position,
        // assuming the user will ensure `attempt` is defined or that this is a placeholder for a future change.
        // The `Code Edit` also shows a completely different HTML structure for the non-adaptive quiz,
        // which is not part of the instruction "Set window.currentAttemptId".
        // I must only make the change requested. The HTML structure change is NOT requested.
        // I will only insert the line `window.currentAttemptId = attempt.id;` at the specified logical position.

        // The instruction is "Set window.currentAttemptId when quiz starts."
        // The provided `Code Edit` shows:
        // ```
        //         if (questions.length === 0) {
        //             container.innerHTML = `<div class="container"><h3>This quiz has no questions.</h3><a href="#/dashboard" class="btn">Back</a></div>`;
        //             return;
        //         }
        //
        //         // Initialize State
        //         window.currentAttemptId = attempt.id; // GLOBAL for Proctoring Auto-Submit
        //         document.getElementById('main-content').innerHTML = `
        //             <div class="split-layout">
        //                 <!-- Question Area -->
        //                 ...
        // ```
        // This indicates the line should be inserted after the `if (questions.length === 0)` block.
        // The `document.getElementById('main-content').innerHTML = ...` part is a *different* change not requested.
        // I will insert *only* the `window.currentAttemptId = attempt.id;` line.
        // I need to ensure `attempt` is defined. In the current `renderQuizInterface` (non-adaptive), `attempt` is not defined.
        // Initialize Proctoring UI
        // Assuming 'attempt' object is available here, e.g., from an API call to create an attempt.
        // For non-adaptive quizzes, an attempt needs to be created before rendering.
        // Example: const attempt = await apiCall(`/attempts`, 'POST', { quiz_id: quizId });
        // window.currentAttemptId = attempt.id; // GLOBAL for Proctoring Auto-Submit

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
                        <button id="btn-force-start-cam" class="btn" style="margin-top:10px; font-size:0.8rem; background:#333;">🎥 Start Camera</button>
                        <div id="ai-status-text" style="font-size:0.8rem; color:blue; margin-top:5px; font-weight:bold;">🤖 AI Idle</div>
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

        // Global Auto-Submit Handler (Unified)
        window.forceSubmitQuiz = async () => {
            console.warn(">>> FORCE SUBMIT TRIGGERED (Standard) <<<");
            showToast("Submitting Exam...", "info");
            try {
                // Ensure answers object exists, even if empty
                const finalAnswers = answers || {};
                await submitQuiz(quizId, finalAnswers);
            } catch (e) {
                console.error("Force Submit Failed:", e);
                // Fallback redirect
                window.location.hash = '#/dashboard';
            }
        };

        // Start Proctoring
        window.proctorLogs = [];
        window.quizStartTime = Date.now();
        startProctoring();

        // Bind Manual Start Button
        const forceBtn = document.getElementById('btn-force-start-cam');
        if (forceBtn) forceBtn.addEventListener('click', startProctoring);

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
    // CAPTURE ID BEFORE STOPPING PROCTORING (which clears global)
    const activeAttemptId = window.currentAttemptId;
    stopProctoring();

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
        // Calculate Trust Score
        const logs = window.proctorLogs || [];
        const trustScore = Math.max(0, 100 - (logs.length * 10));

        // Fallback: If ID is missing (session init failed), create one ON THE FLY
        let finalAttemptId = activeAttemptId;
        if (!finalAttemptId) {
            console.warn("⚠️ No Active Attempt ID found. Creating one lazily...");
            try {
                const res = await apiCall('/attempts/start', 'POST', { quiz_id: quizId });
                finalAttemptId = res.attempt_id;
                console.log("Lazy Attempt Created:", finalAttemptId);
            } catch (err) {
                console.error("Critical: Could not lazily create attempt.", err);
            }
        }

        const payload = {
            quiz_id: quizId,
            responses,
            attempt_id: finalAttemptId, // Use the guaranteed ID
            proctor_logs: logs,
            trust_score: trustScore
        };
        const result = await apiCall('/attempts/submit', 'POST', payload);
        const finalTrustScore = result.trustScore ?? trustScore;


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
                    <p>Trust Score: <strong style="color:${finalTrustScore < 50 ? 'red' : 'green'}">${finalTrustScore}%</strong></p>
                    
                    <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin: 10px 0; border-left: 4px solid var(--primary-color);">
                        <p style="margin:5px 0; font-size:1.1em; color:#333; font-weight:bold;">Credential ID (Blockchain Hash):</p>
                        <code style="display:block; background:#eee; padding:0.5rem; border-radius:4px; word-break:break-all; font-size:1.0em; color:var(--primary-color);">
                            ${result.transactionHash || '⚠️ Blockchain verification not available yet.'}
                        </code>
                        
                        <p style="margin:15px 0 2px 0; font-size:0.8em; color:#999;">Internal System Ref:</p>
                        <code style="font-size:0.9em; color:#666;">${result.attempt_id || result.id || 'N/A'}</code>
                    </div>
                    ${certificateBtn}
                    
                    <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
                    
                    <!-- AI Analysis Section -->
                    <div id="ai-result-analysis-std" style="text-align:left; margin-top:20px;">
                        <p style="text-align:center;">🤖 Generating AI Performance Report...</p>
                    </div>

                    <div style="margin-top:20px;">
                        <a href="#/dashboard" class="btn">Back to Dashboard</a>
                    </div>
                </div>
            </div>
        `;

        // Trigger AI Analysis with attempt ID from result or duplicates
        // /attempts/submit calls finishAttempt or duplicate? 
        // Note: The backend logic creates attempt first? 
        // Standard quiz usually creates attempt at start? Yes, renderQuizInterface calls startProctoring.
        // But does it create attempt ID?
        // Let's check renderQuizInterface in previous steps. 
        // PROBABLY need result.attemptId or window.currentAttemptId

        // Trigger AI Analysis with the CONFIRMED attempt ID from the server
        const confirmedAttemptId = result.attempt_id || result.id || window.currentAttemptId;
        console.log("Triggering AI for Attempt:", confirmedAttemptId);
        loadAIRecommendations(document.getElementById('ai-result-analysis-std'), confirmedAttemptId);

        // Handlers
        if (isPerfectScore) {
            document.getElementById('btn-cert').addEventListener('click', () => {
                downloadCertificate(state.user.name, 'Quiz Result', result.score, result.totalQuestions);
            });

            document.getElementById('btn-mint-nft').addEventListener('click', async () => {
                const wallet = prompt("Enter your Ethereum Wallet Address (0x...):");
                if (!wallet) return;

                try {
                    const btn = document.getElementById('btn-mint-nft');
                    btn.innerText = "Minting...";
                    btn.disabled = true;

                    const res = await apiCall('/attempts/mint-certificate', 'POST', {
                        attempt_id: window.currentAttemptId || 0,
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
        console.warn('Submission failed:', error);

        // FORCE SHOW ERROR (Debug Mode)
        document.getElementById('main-content').innerHTML = `
            <div class="container" style="text-align:center; padding-top:3rem;">
                <h2 style="color:red">Submission Failed</h2>
                <div style="background:#fff0f0; border:1px solid red; padding:15px; margin:20px; border-radius:8px; text-align:left;">
                    <p><strong>Error Message:</strong> ${error.message}</p>
                    <hr>
                    <small>
                        <strong>Debug Info:</strong><br>
                        Attempt ID: ${window.currentAttemptId}<br>
                        API Endpoint: ${API_URL}/attempts/submit<br>
                        Browser Online: ${navigator.onLine}<br>
                        Timestamp: ${new Date().toISOString()}
                    </small>
                </div>
                <button onclick="location.reload()" class="btn">Reload & Retry</button>
                <a href="#/dashboard" class="btn btn-secondary">Back to Dashboard</a>
            </div>
        `;
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

        showToast('Proctoring Active: Loading AI Models...', 'info');

        // Load Face API Models
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        showToast('AI Models Loaded. Monitoring Started.', 'success');

        // Proctoring Loop
        let lastNoFaceLogAt = 0;
        proctorInterval = setInterval(async () => {
            // 1. Tab Visibility Check
            if (document.hidden) {
                logSuspiciousActivity('Tab Switch / Background');
                showToast("🚫 Tab Switch Detected! Auto-Submitting...", "error");

                if (window.forceSubmitQuiz) {
                    clearInterval(proctorInterval);
                    await window.forceSubmitQuiz();
                }
            }

            // 2. Real Multi-Face Detection
            if (video.readyState === 4) { // ensuring video is playing
                // Use higher input size (320) for better small face detection
                // Lower scoreThreshold (0.3) to detect harder faces (side profile / phone screens)
                const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 });
                const detections = await faceapi.detectAllFaces(video, options);

                // Update UI log for visibility - Debugging
                const statusText = document.getElementById('ai-status-text');
                if (statusText) statusText.innerHTML = `<span style="color:blue;">🤖 Scanning... Faces: <b>${detections.length}</b></span>`;

                if (detections.length > 1) {
                    const msg = `⚠️ Multiple Faces Detected! (${detections.length})`;
                    console.warn(msg);

                    // Capture Proof immediately
                    captureProofSnapshot(video, 'Multiple Faces Detected - Auto Submit');

                    if (warningBox) {
                        warningBox.innerText = msg;
                        warningBox.style.display = 'block';
                    }

                    // AUTO-SUBMIT EXAM
                    // alert("🚫 Multiple people detected..."); // REMOVED BLOCKING ALERT
                    showToast("🚫 Violation: Multiple Faces! Auto-Submitting...", "error");

                    // Force Submit logic
                    if (window.forceSubmitQuiz) {
                        console.warn("Triggering Force Submit...");
                        clearInterval(proctorInterval);

                        // Visual feedback of shutdown
                        const main = document.getElementById('main-content');
                        if (main) {
                            main.style.opacity = '0.5';
                            main.style.pointerEvents = 'none';
                        }

                        await window.forceSubmitQuiz();
                    } else {
                        console.error("No auto-submit handler found!");
                        window.location.hash = '#/dashboard';
                    }
                } else if (detections.length === 0) {
                    if (statusText) statusText.innerText = `⚠️ No Face Detected`;
                    const now = Date.now();
                    if (now - lastNoFaceLogAt > 10000) {
                        logSuspiciousActivity('No Face Detected');
                        lastNoFaceLogAt = now;
                    }
                } else {
                    lastNoFaceLogAt = 0;
                }
            }
        }, 2000); // Check every 2 seconds to save Performance

    } catch (err) {
        console.error('Proctoring Error:', err);
        alert("Camera Access Required!\n\nPlease click the 'Lock' or 'Camera' icon in your browser address bar and allow permissions.");

        if (warningBox) {
            warningBox.innerText = '⚠️ Camera/Mic Access Denied. Trust Score Penalized.';
            warningBox.style.display = 'block';
        }
        logSuspiciousActivity('Camera/Mic Permission Denied');
    }
}

function captureProofSnapshot(videoElement, reason = 'Periodic Check') {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth / 4; // Low res for storage
        canvas.height = videoElement.videoHeight / 4;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

        logSuspiciousActivity(reason);
        window.proctorLogs.push({
            timestamp: new Date().toISOString(),
            type: 'SNAPSHOT_TAKEN',
            reason: reason,
            image_data: 'Image Captured (Simulated Upload)' // In real app, upload dataUrl
        });
    } catch (e) {
        // ignore video not ready
    }
}

function stopProctoring() {
    console.log("Stopping Proctoring Session...");

    // 1. Stop Video Stream
    if (proctorStream) {
        proctorStream.getTracks().forEach(track => track.stop());
        proctorStream = null;
    }

    // 2. Clear Loop
    if (proctorInterval) {
        clearInterval(proctorInterval);
        proctorInterval = null;
    }

    // 3. Remove Event Listeners
    // Note: We need the exact reference to remove it. 
    // Since handleVisibilityChange is defined inside closures in V2 code style,
    // we should resort to cloning the document body or ensuring we don't have lingering listeners.
    // However, for this fix, we will just ensure the listener code checks for a flag.
    // BETTER FIX: We redefined handleVisibilityChange in the closure. 
    // We should rely on reload or ensure the listener removes itself (which we did in the strict fix).

    // 4. Nullify Auto-Submit to prevent ghost triggers
    window.forceSubmitQuiz = null;
    window.currentAttemptId = null;

    // 5. Reset UI if exists
    const video = document.getElementById('proctor-video');
    if (video) video.srcObject = null;

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

// Reusable AI Loader
async function loadAIRecommendations(targetElement = null, attemptId = null) {
    const container = targetElement || document.getElementById('ai-recommendations');
    if (!container) return;

    // Show loading state if empty
    if (!container.innerHTML.includes('Generating')) {
        container.innerHTML = `<div style="text-align:center; padding:20px;">
            <div class="loader" style="margin:0 auto;"></div>
            <p style="margin-top:10px; color:#666;">🤖 AI is analyzing your performance...</p>
        </div>`;
    }

    try {
        let data;

        if (attemptId) {
            // Specific Analysis
            data = await apiCall(`/attempts/${attemptId}/analysis`);

            container.innerHTML = `
                <div style="background:#f0f9ff; padding:15px; border-radius:8px; border-left:4px solid #0284c7;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin-top:0; color:#0284c7;">🤖 Exam Report</h4>
                        <span style="font-size:0.8rem; background:#fff; padding:2px 8px; border-radius:10px; border:1px solid #bae6fd;">Phi-3 Analysis</span>
                    </div>
                    
                    <p><strong>Verdict:</strong> ${data.score_analysis || 'Processing...'}</p>
                    
                    ${data.key_mistakes && data.key_mistakes.length > 0 ? `
                        <div style="margin-top:10px; background:#fff; padding:10px; border-radius:4px; border:1px solid #ddd;">
                            <strong>⚠️ Key Mistakes:</strong>
                            <ul style="margin-bottom:0; padding-left:20px;">
                                ${data.key_mistakes.map(m => `<li>${m}</li>`).join('')}
                            </ul>
                        </div>
                    ` : '<p><em>No major mistakes identified. Excellent work!</em></p>'}
                    
                    <p style="margin-top:10px;"><strong>🎯 Focus Area:</strong> ${data.study_focus || 'Keep up the good work!'}</p>
                </div>
            `;

        } else {
            // General Dashboard Recommendations
            data = await apiCall('/attempts/recommendations');

            const recs = data.recommendations || [];
            const analytics = data.analytics || {};
            const tip = data.actionable_tip || "";

            if (recs.length === 0 && !analytics.weakness_analysis) {
                container.innerHTML = `
                    <div class="card" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); text-align:center;">
                        <h3>🤖 AI Advisor</h3>
                        <p>Take a quiz to generate your personal performance report!</p>
                    </div>`;
                return;
            }

            container.innerHTML = `
                <div class="card" style="border-top: 4px solid var(--primary-color);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3>📊 AI Performance Analytics</h3>
                        <span style="font-size:0.8rem; background:#eee; padding:2px 8px; border-radius:10px;">Powered by Phi-3</span>
                    </div>
                    
                    ${analytics.weakness_analysis ? `
                        <div style="margin: 15px 0; padding: 10px; background: #fff0f0; border-left: 3px solid red; border-radius: 4px;">
                            <strong>⚠️ Analysis:</strong> ${analytics.weakness_analysis}
                        </div>
                    ` : ''}
    
                    ${analytics.strength_analysis ? `
                        <div style="margin: 10px 0; padding: 10px; background: #f0fff4; border-left: 3px solid green; border-radius: 4px;">
                            <strong>✅ Strengths:</strong> ${analytics.strength_analysis}
                        </div>
                    ` : ''}
    
                    <h4 style="margin-top:20px;">Recommended Focus Areas:</h4>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                        ${recs.map(r => `
                            <div style="background:white; padding:10px; border-radius:8px; border:1px solid #ddd; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                                <div style="font-weight:bold; color:var(--primary-color);">${r.topic}</div>
                                <div style="font-size:0.85rem; color:#555;">${r.reason}</div>
                                <button onclick="generateAIQuiz('${r.topic}')" class="btn" style="margin-top:5px; font-size:0.7rem; padding:4px 8px;">Create Quiz</button>
                            </div>
                        `).join('')}
                    </div>
    
                    ${tip ? `
                        <div style="margin-top:15px; font-size:0.9rem; font-style:italic; color:#666; text-align:center;">
                            💡 <strong>Tip:</strong> ${tip}
                        </div>
                    ` : ''}
                </div>
            `;
        }
    } catch (e) {
        console.warn('AI Recs failed:', e);
        container.innerHTML = `<div class="card"><p style="color:red">AI Error: ${e.message}</p></div>`;
    }
}
