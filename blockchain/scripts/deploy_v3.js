import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("🚀 Starting AI Proctroing Exam Smart Contract Deployment...");
    const { ethers } = await network.connect();

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // 1. Deploy TidalToken (Reputation)
    const TidalToken = await ethers.getContractFactory("TidalToken");
    const tidalToken = await TidalToken.deploy();
    await tidalToken.waitForDeployment();
    const tokenAddress = await tidalToken.getAddress();
    console.log(`✅ TidalToken deployed to: ${tokenAddress}`);

    // 2. Deploy CertificateNFT (Soulbound)
    const CertificateNFT = await ethers.getContractFactory("CertificateNFT");
    const certificateNFT = await CertificateNFT.deploy();
    await certificateNFT.waitForDeployment();
    const nftAddress = await certificateNFT.getAddress();
    console.log(`✅ CertificateNFT deployed to: ${nftAddress}`);

    // 3. Deploy AcademicIdentity (DID Registry)
    const AcademicIdentity = await ethers.getContractFactory("AcademicIdentity");
    const academicIdentity = await AcademicIdentity.deploy();
    await academicIdentity.waitForDeployment();
    const identityAddress = await academicIdentity.getAddress();
    console.log(`✅ AcademicIdentity deployed to: ${identityAddress}`);

    // 4. Deploy QuizResultLogger (Legacy Support / Audit Trail)
    const QuizResultLogger = await ethers.getContractFactory("QuizResultLogger");
    const logger = await QuizResultLogger.deploy();
    await logger.waitForDeployment();
    const loggerAddress = await logger.getAddress();
    console.log(`✅ QuizResultLogger deployed to: ${loggerAddress}`);

    // Save Config
    const config = {
        tidalTokenAddress: tokenAddress,
        certificateNFTAddress: nftAddress,
        academicIdentityAddress: identityAddress,
        quizLoggerAddress: loggerAddress,
        deployerAddress: deployer.address,
        network: network.name
    };

    const frontendPath = path.resolve(__dirname, '../../frontend/js/contract-config-v3.json');
    fs.writeFileSync(frontendPath, JSON.stringify(config, null, 2));
    console.log(`📝 Config saved to: ${frontendPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
