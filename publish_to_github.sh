#!/bin/bash

echo "🚀 AI-PROCTROING-EXAM - AUTOMATIC GITHUB PUBLISHER"
echo "==============================================="
echo "This script will upload your project to GitHub automatically."
echo "You will need:"
echo "1. Your GitHub Username"
echo "2. The Name of the Repository you created on GitHub (e.g., 'AI-PROCTROING-EXAM')"
echo "3. A Personal Access Token (classic) with 'repo' scope."
echo "   -> Get it here: https://github.com/settings/tokens/new"
echo "-----------------------------------------------"

# Check for Git
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Ask for Credentials
read -p "Enter your GitHub Username: " USERNAME
read -p "Enter your GitHub Repo Name (e.g., AI-PROCTROING-EXAM): " REPONAME
echo "Enter your GitHub Personal Access Token (hidden input): "
read -s TOKEN

if [ -z "$USERNAME" ] || [ -z "$REPONAME" ] || [ -z "$TOKEN" ]; then
    echo "❌ Error: All fields are required."
    exit 1
fi

echo ""
echo "⏳ Initializing Git..."
git init

echo "📦 adding files..."
git add .

echo "💾 Committing Code..."
git commit -m "Initial commit by AI Proctroing Exam Auto-Publisher"

# Construct URL with Token
REMOTE_URL="https://$USERNAME:$TOKEN@github.com/$USERNAME/$REPONAME.git"

# Add Remote and Push
echo "🔗 Connecting to GitHub..."
git remote remove origin 2>/dev/null
git remote add origin "$REMOTE_URL"

echo "🚀 Pushing to GitHub (main branch)..."
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Your project is now live at:"
    echo "https://github.com/$USERNAME/$REPONAME"
    echo "==============================================="
    echo "🔒 Security Note: Your token is saved in .git/config."
    echo "If this is a shared computer, run 'git remote remove origin' after sharing."
else
    echo "❌ Push Failed. Check your Token or Repo Name."
fi
