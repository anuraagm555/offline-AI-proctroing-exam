# 🚀 AI Proctoring Exam - Blockchain Powered AI Quiz Platform

**AI Proctoring Exam** is a decentralized, AI-enhanced assessment platform. It generates quizzes dynamically using **Ollama (Phi-3)**, records every student attempt on a local **Hardhat Blockchain**, and mints **Soulbound NFT Certificates** for high achievers.

---

## 🛠️ Prerequisites (Install These First)

Before running the project, ensure you have the following installed on your system:

1.  **Node.js** (v18 or higher) & **npm**
    *   [Download Node.js](https://nodejs.org/)
2.  **Git**
    *   [Download Git](https://git-scm.com/)
3.  **Ollama** (For AI Quiz Generation)
    *   [Download Ollama](https://ollama.com/)
    *   **Crucial Step:** After installing, open a terminal and run:
        ```bash
        ollama run phi3:mini
        ```
        (Keep this running or close it after it downloads the model).
4.  **MetaMask Extension** (In your Browser)
    *   You will need this to interact with the blockchain features.

---

## 📥 Installation

Open your terminal and run these commands one by one:

### 1. Clone the Repository
```bash
git clone https://github.com/AnishChandraPolkampally/AI-PROCTROING-EXAM.git
cd AI-PROCTROING-EXAM
```

### 2. Install Dependencies
We need to install libraries for the Backend, Frontend, and Blockchain components.

**Root:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
cd ..
```

**Blockchain:**
```bash
cd blockchain
npm install
cd ..
```

---

## ⚙️ Configuration (Secrets)

1.  Go to the `backend` folder.
2.  Create a file named `.env`.
3.  Paste the following content into it:

```env
PORT=5001
# Secret key for Admin Registration (keep this safe!)
ADMIN_SECRET_CODE=adminadmin
# Access Token Secret
JWT_SECRET=supersecret_enterprise_key_2024
# Local Blockchain Settings
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
# Metamask / Hardhat Account #0 Private Key (Default Test Key)
BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

---

## 🚀 How to Run the Project

You need to open **4 Separate Terminals** to run the full system.

### 1️⃣ Terminal 1: The Blockchain
This starts a local Ethereum network on your computer.
```bash
cd blockchain
npx hardhat node
```
*Keep this running. It will show transaction logs.*

### 2️⃣ Terminal 2: Deploy Contracts
This puts your Smart Contracts onto the local blockchain.
*(Run this ONCE every time you restart Terminal 1)*
```bash
cd blockchain
npx hardhat run scripts/deploy_v3.js --network localhost
```
*You should see "✅ Connected to Local Blockchain" and contract addresses.*

### 3️⃣ Terminal 3: The Backend Server
This handles the API, Database, and AI processing.
```bash
cd backend
npm start
```
*You should see "🚀 Server running on port 5001" and "✅ Database Connected".*

### 4️⃣ Terminal 4: The Frontend
This launches the website.
```bash
npx http-server frontend -p 8080
```
*Now open your browser and go to:* `http://localhost:8080`

---

## 📖 Usage Guide

### 1. Admin Access
*   **Register** a new account.
*   Select Role: **Admin**.
*   Secret Code: `adminadmin` (or whatever you set in `.env`).
*   **Dashboard:** You can create quizzes manually or generate them using AI.

### 2. Student Access
*   **Register** as a Student.
*   **Take Quiz:** Select a quiz from the dashboard.
*   **Proctoring:** The camera will activate to monitor for cheating (looking away, multiple faces).
*   **Results:** Upon finishing, if you pass, a "Verifying on Blockchain..." status will appear.

### 3. Verify Certificate
*   Copy the **Transaction Hash** (starts with `0x...`) from the student's result or "My Attempts".
*   Go to the **Admin Dashboard** -> **Verify Credential**.
*   Paste the hash to see the authentic score recorded on the blockchain.

### 4. MetaMask Setup (Optional but Recommended)
*   Network Name: `Localhost 8545`
*   RPC URL: `http://127.0.0.1:8545`
*   Chain ID: `31337`
*   Currency: `ETH`
*   **Import Account:** Use one of the private keys shown in Terminal 1 to have "fake" ETH for testing.

---

## ❓ Troubleshooting

*   **"Blockchain connection failed":** Ensure Terminal 1 is running `npx hardhat node`.
*   **"Error deploying contracts":** Make sure Terminal 1 is running BEFORE you run the deploy script in Terminal 2.
*   **"AI Generation failed":** Ensure Ollama is running (`ollama serve` or just open the app) and you have downloaded the model (`ollama pull phi3`).
*   **"Admin Register Failed":** Double-check the `ADMIN_SECRET_CODE` in `backend/.env`.

---

**Built with ❤️ for the Future of Education.**
