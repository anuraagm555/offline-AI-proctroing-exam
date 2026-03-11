#!/bin/bash

echo "🤖 Setting up AI for AI Proctroing Exam App..."

# 1. Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is NOT installed."
    echo "👉 Please install it from https://ollama.com/download"
    exit 1
fi

echo "✅ Ollama is installed."

# 2. Check if Ollama Server is running
if ! pgrep -x "ollama" > /dev/null; then
    echo "⚠️  Ollama Server is NOT running."
    echo "🚀 Starting Ollama Server in the background..."
    ollama serve &
    OLLAMA_PID=$!
    echo "⏳ Waiting for Ollama to start..."
    sleep 5
else
    echo "✅ Ollama Server is running."
fi

# 3. Pull the Phi-3 Model
echo "📥 Pulling 'phi3' model (this may take a while)..."
ollama pull phi3

if [ $? -eq 0 ]; then
    echo "✅ AI Model 'phi3' is ready!"
    echo "🎉 You can now use the AI Quiz Generator in the Admin Dashboard."
else
    echo "❌ Failed to pull model. Please try running 'ollama pull phi3' manually."
fi

# Keep script running if we started ollama, or just exit?
# Usually better to let the user manage the server.
echo "ℹ️  Note: Keep 'ollama serve' running for the AI features to work."
