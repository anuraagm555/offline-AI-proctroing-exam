# uploading to GitHub

I have created an **Automatic Uploader Script** (`publish_to_github.sh`) to do the hard work for you.

## Step 1: Get your Secret Code (Token)
GitHub doesn't use passwords anymore. You need a **Personal Access Token**.
1.  Log in to GitHub.
2.  Go to **Settings** -> **Developer Settings** -> **Personal Access Tokens** -> **Tokens (classic)**.
3.  Click **Generate new token (classic)**.
4.  Standard: Give it a name (e.g., "Upload Script").
5.  **Scopes:** Check the box for **`repo`** (Full control of private repositories).
6.  Click **Generate token**.
7.  **COPY THE TOKEN** (starts with `ghp_...`). You won't see it again.

## Step 2: Create the Repo
1.  Go to `github.com/new`.
2.  Repository Name: `AI-PROCTROING-EXAM` (or whatever you like).
3.  Description: "My AI Blockchain Project".
4.  Public/Private: Your choice.
5.  **Do NOT initialize** with README/gitignore (we already have them).
6.  Click **Create repository**.

## Step 3: Run the Script
In your terminal, run:

```bash
sh publish_to_github.sh
```

It will ask for:
1.  **Username:** Your GitHub username.
2.  **Repo Name:** `tidal-pathfinder` (must match what you created).
3.  **Token:** Paste the `ghp_...` token you copied.

That's it! The script will upload everything for you.
