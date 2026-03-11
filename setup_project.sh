#!/bin/bash

echo "🚀 Starting Enterprise AI Proctroing Exam Setup..."

# 1. Install Dependencies
echo "📦 Installing Dependencies..."
(cd backend && npm install)
(cd blockchain && npm install)

# 2. Check .env
if [ ! -f backend/.env ]; then
    echo "⚙️ Creating .env file..."
    echo "PORT=5001" > backend/.env
    echo "JWT_SECRET=supersecret_enterprise_key_2024" >> backend/.env
    echo "BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545" >> backend/.env
    echo "BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" >> backend/.env
fi

# 3. Kill existing processes (Optional, be careful)
echo "🧹 Cleaning up ports 5001 and 8545..."
lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:8545 | xargs kill -9 2>/dev/null

echo "✅ Setup Complete!"
echo ""
echo "👉 NOW RUN THESE IN SEPARATE TERMINALS:"
echo ""
echo "1️⃣  TERMINAL 1 (Blockchain):"
echo "    cd blockchain && npx hardhat node"
echo ""
echo "2️⃣  TERMINAL 2 (Deploy):"
echo "    cd blockchain && npx hardhat run scripts/deploy_v3.js --network localhost"
echo ""
echo "3️⃣  TERMINAL 3 (Backend):"
echo "    cd backend && npm start"
echo ""
echo "4️⃣  TERMINAL 4 (Frontend):"
echo "    npx http-server frontend -p 8080"
