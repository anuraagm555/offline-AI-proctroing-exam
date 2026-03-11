// Basic IDB wrapper for offline storage
// IndexedDB Helper with Encryption
const DB_NAME = 'AI Proctroing ExamDB';
const DB_VERSION = 1;
const ENCRYPTION_KEY = 'ai-proctroing-exam-secure-offline-key'; // In prod, derive from user password/token

// Open Database
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            // Store quizzes for offline access
            if (!db.objectStoreNames.contains('quizzes')) {
                db.createObjectStore('quizzes', { keyPath: 'id' });
            }
            // Store attempts made offline
            if (!db.objectStoreNames.contains('offline_attempts')) {
                db.createObjectStore('offline_attempts', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// Encrypt Helper
function encryptData(data) {
    if (!data) return null;
    return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
}

// Decrypt Helper
function decryptData(ciphertext) {
    if (!ciphertext) return null;
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
        console.error('Decryption failed', e);
        return null;
    }
}

// Save Quiz (Encrypted) to IDB
async function saveQuizOffline(quiz) {
    const db = await openDB();
    const tx = db.transaction('quizzes', 'readwrite');
    const store = tx.objectStore('quizzes');

    // Encrypt the quiz object
    const encryptedQuiz = {
        id: quiz.id,
        data: encryptData(quiz),
        lastUpdated: Date.now()
    };

    store.put(encryptedQuiz);
    return tx.complete;
}

// Get Quiz (Decrypted) from IDB
async function getQuizOffline(quizId) {
    const db = await openDB();
    const tx = db.transaction('quizzes', 'readonly');
    const store = tx.objectStore('quizzes');

    return new Promise((resolve, reject) => {
        // IDB keys are type-sensitive. Ensure quizId is correct type (usually integer from API).
        const request = store.get(parseInt(quizId));
        request.onsuccess = () => {
            const result = request.result;
            if (result) {
                resolve(decryptData(result.data));
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

// Save Offline Attempt (Encrypted)
async function saveOfflineAttempt(attemptData) {
    const db = await openDB();
    const tx = db.transaction('offline_attempts', 'readwrite');
    const store = tx.objectStore('offline_attempts');

    const record = {
        data: encryptData(attemptData),
        timestamp: Date.now(),
        synced: false
    };

    store.add(record);
    return tx.complete;
}

// Get All Pending Attempts
async function getPendingAttempts() {
    const db = await openDB();
    const tx = db.transaction('offline_attempts', 'readonly');
    const store = tx.objectStore('offline_attempts');

    return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => {
            const rawRecords = request.result || [];
            const decrypted = rawRecords.map(r => ({
                id: r.id, // IDB auto-id
                ...decryptData(r.data)
            }));
            resolve(decrypted);
        };
    });
}

// Delete Attempt after Sync
async function deleteOfflineAttempt(id) {
    const db = await openDB();
    const tx = db.transaction('offline_attempts', 'readwrite');
    const store = tx.objectStore('offline_attempts');
    store.delete(id);
    return tx.complete;
}
