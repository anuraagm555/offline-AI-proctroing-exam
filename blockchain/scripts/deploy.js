import { artifacts, network } from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const { ethers } = await network.connect();
    const QuizResultLogger = await ethers.getContractFactory("QuizResultLogger");
    const quizLogger = await QuizResultLogger.deploy();

    await quizLogger.waitForDeployment();

    const address = await quizLogger.getAddress();
    console.log(`QuizResultLogger deployed to ${address}`);

    // Get artifact for ABI
    const artifact = await artifacts.readArtifact("QuizResultLogger");

    const contractData = {
        address: address,
        abi: artifact.abi
    };

    // Ensure config directory exists
    const configDir = path.resolve(__dirname, '../../backend/config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const outputPath = path.join(configDir, 'contractData.json');
    fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2));
    console.log(`Contract data saved to ${outputPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
