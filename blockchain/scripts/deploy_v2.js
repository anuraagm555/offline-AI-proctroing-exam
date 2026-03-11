import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const { ethers } = await network.connect();
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy QuizResultLogger (Existing)
    const QuizResultLogger = await ethers.getContractFactory("QuizResultLogger");
    const logger = await QuizResultLogger.deploy();
    await logger.waitForDeployment();
    console.log("QuizResultLogger deployed to:", await logger.getAddress());

    // 2. Deploy CertificateNFT (New)
    const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
    const certNFT = await CertificateNFT.deploy();
    await certNFT.waitForDeployment();
    console.log("CertificateNFT deployed to:", await certNFT.getAddress());

    // Save Config for Frontend
    const configDir = path.join(__dirname, '..', '..', 'frontend', 'js');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }

    const contractConfig = {
        quizLoggerAddress: await logger.getAddress(),
        certificateNFTAddress: await certNFT.getAddress(),
        networkId: "31337" // Hardhat Localhost
    };

    fs.writeFileSync(
        path.join(configDir, 'contract-config.json'),
        JSON.stringify(contractConfig, null, 2)
    );

    console.log("Contract configuration saved to frontend/js/contract-config.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
