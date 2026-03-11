#!/bin/bash

echo "🛑 KILLING OLD PROCESSES..."
pkill -f "node server.js"
# Note: We won't kill hardhat node automatically to avoid disrupting Terminal 1
# pkill -f "hardhat node" 

echo "✅ Old backend stopped."

echo "⏳ Waiting for ports to clear..."
sleep 2

echo "📜 DEPLOYING SMART CONTRACTS (V3)..."
cd blockchain
npx hardhat run scripts/deploy_v3.js --network localhost
if [ $? -ne 0 ]; then
    echo "❌ Deployment Failed! Is your Hardhat Node running?"
    echo "👉 Open a separate terminal and run: cd blockchain && npx hardhat node"
    exit 1
fi
cd ..

echo "🔙 STARTING BACKEND SERVER..."
cd backend
echo "🌱 SEEDING DATABASE (Reset)..."
node seed.js
echo "🚀 Server launching... (Press Ctrl+C to stop)"
node server.js
