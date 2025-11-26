import ethers from "hardhat";
import * as fs from "fs";

interface DeploymentInfo {
  network: string;
  contractAddress: string;
  deployer: string;
  deploymentTime: string;
  blockNumber: number;
}

async function main(): Promise<void> {
  console.log("🚀 Starting deployment...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());
  console.log("");

  // Deploy the VotingContract
  const VotingContract = await ethers.getContractFactory("VotingContract");
  console.log("⏳ Deploying VotingContract...");
  
  const votingContract = await VotingContract.deploy();
  await votingContract.deployed();

  console.log("✅ VotingContract deployed to:", votingContract.address);
  console.log("👤 Owner:", await votingContract.owner());
  console.log("");

  // Wait for a few block confirmations
  console.log("⏳ Waiting for block confirmations...");
  await votingContract.deployTransaction.wait(5);
  console.log("✅ Contract confirmed!\n");

  // Optional: Verify on Etherscan (if deploying to testnet/mainnet)
  const network = await ethers.provider.getNetwork();
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("🔍 Verifying contract on Etherscan...");
    try {
      const hre = require("hardhat");
      await hre.run("verify:verify", {
        address: votingContract.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified!");
    } catch (error: any) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo: DeploymentInfo = {
    network: network.name,
    contractAddress: votingContract.address,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    blockNumber: votingContract.deployTransaction.blockNumber || 0,
  };

  console.log("\n📊 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment-info.json");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
