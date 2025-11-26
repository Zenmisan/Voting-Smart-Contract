import hre from "hardhat";
import { formatEther, parseEther } from "viem";
import * as fs from "fs";

interface DeploymentInfo {
  network: string;
  contractAddress: string;
  deployer: string;
  deploymentTime: string;
  blockNumber: bigint;
}

async function main(): Promise<void> {
  console.log("🚀 Starting deployment...\n");

  // Get deployer account
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("📝 Deploying contracts with account:", deployer.account.address);
  
  // Get balance
  const balance = await publicClient.getBalance({ 
    address: deployer.account.address 
  });
  console.log("💰 Account balance:", formatEther(balance), "ETH");
  console.log("");

  // Deploy the VotingContract
  console.log("⏳ Deploying VotingContract...");
  
  const votingContract = await hre.viem.deployContract("VotingContract");

  console.log("✅ VotingContract deployed to:", votingContract.address);
  
  // Get owner
  const owner = await votingContract.read.owner();
  console.log("👤 Owner:", owner);
  console.log("");

  // Wait for confirmations
  console.log("⏳ Waiting for block confirmations...");
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: votingContract.deploymentTransaction().hash,
    confirmations: 5
  });
  console.log("✅ Contract confirmed!\n");

  // Save deployment info
  const deploymentInfo: DeploymentInfo = {
    network: hre.network.name,
    contractAddress: votingContract.address,
    deployer: deployer.account.address,
    deploymentTime: new Date().toISOString(),
    blockNumber: receipt.blockNumber,
  };

  console.log("📊 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));

  // Save to file
  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2)
  );
  console.log("\n💾 Deployment info saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
