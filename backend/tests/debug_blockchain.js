const blockchainService = require('../services/blockchainService');

async function testBlockchain() {
    console.log("🚀 Initializing Blockchain Service...");
    await blockchainService.initBlockchain();

    console.log("🔗 Attempting to log a test attempt...");
    // Mock Data: User ID 1, Quiz ID 1, Score 100, Timestamp Now
    const txHash = await blockchainService.logAttemptToBlockchain(1, 1, 100, Math.floor(Date.now() / 1000));

    if (txHash) {
        console.log(`✅ Success! Transaction Hash: ${txHash}`);
    } else {
        console.error("❌ Failed to log attempt (Hash is null). Check console for errors.");
    }
}

testBlockchain();
