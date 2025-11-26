// ============================================
// INTERACTION SCRIPT - COMPLETE VOTING CYCLE
// File: scripts/interact.ts
// ============================================

import ethers from "hardhat";
import { VotingContract } from "../typechain-types/index.js";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import * as fs from "fs";

interface DeploymentInfo {
  contractAddress: string;
  network: string;
  deployer: string;
  deploymentTime: string;
  blockNumber: number;
}

async function main(): Promise<void> {
  console.log("🗳️  Starting Voting Contract Interaction\n");

  // Load deployment info
  const deploymentData = fs.readFileSync("deployment-info.json", "utf8");
  const deploymentInfo: DeploymentInfo = JSON.parse(deploymentData);
  const contractAddress = deploymentInfo.contractAddress;

  // Get signers (accounts)
  const [owner, voter1, voter2, voter3]: SignerWithAddress[] = await ethers.getSigners();
  console.log("👥 Accounts:");
  console.log("  Owner:", owner.address);
  console.log("  Voter1:", voter1.address);
  console.log("  Voter2:", voter2.address);
  console.log("  Voter3:", voter3.address);
  console.log("");

  // Connect to deployed contract
  const VotingContract = await ethers.getContractFactory("VotingContract");
  const votingContract = VotingContract.attach(contractAddress) as VotingContract;

  try {
    // ==================== STEP 1: REGISTER CANDIDATES ====================
    console.log("📝 STEP 1: Registering Candidates\n");

    console.log("  Registering Alice...");
    let tx = await votingContract.connect(owner).registerCandidate("Alice");
    await tx.wait();
    console.log("  ✅ Alice registered");

    console.log("  Registering Bob...");
    tx = await votingContract.connect(owner).registerCandidate("Bob");
    await tx.wait();
    console.log("  ✅ Bob registered");

    console.log("  Registering Charlie...");
    tx = await votingContract.connect(owner).registerCandidate("Charlie");
    await tx.wait();
    console.log("  ✅ Charlie registered\n");

    // Get all candidates
    const candidateCount = await votingContract.candidateCount();
    console.log("  Total candidates registered:", candidateCount.sub(1).toString());
    console.log("");

    // ==================== STEP 2: OPEN VOTING ====================
    console.log("🔓 STEP 2: Opening Voting\n");

    const votingDuration = 600; // 10 minutes
    tx = await votingContract.connect(owner).openVoting(votingDuration);
    await tx.wait();
    console.log(`  ✅ Voting opened for ${votingDuration} seconds (${votingDuration/60} minutes)`);
    
    const isActive = await votingContract.isVotingActive();
    console.log("  Voting active:", isActive);
    console.log("");

    // ==================== STEP 3: REGISTER VOTERS ====================
    console.log("👥 STEP 3: Registering Voters\n");

    console.log("  Registering Voter1...");
    tx = await votingContract.connect(voter1).registerAVoter();
    await tx.wait();
    console.log("  ✅ Voter1 registered");

    console.log("  Registering Voter2...");
    tx = await votingContract.connect(voter2).registerAVoter();
    await tx.wait();
    console.log("  ✅ Voter2 registered");

    console.log("  Registering Voter3...");
    tx = await votingContract.connect(voter3).registerAVoter();
    await tx.wait();
    console.log("  ✅ Voter3 registered\n");

    // ==================== STEP 4: CAST VOTES ====================
    console.log("🗳️  STEP 4: Casting Votes\n");

    console.log("  Voter1 voting for Alice (ID: 1)...");
    tx = await votingContract.connect(voter1).voteForACandidate(1);
    await tx.wait();
    console.log("  ✅ Vote cast");

    console.log("  Voter2 voting for Alice (ID: 1)...");
    tx = await votingContract.connect(voter2).voteForACandidate(1);
    await tx.wait();
    console.log("  ✅ Vote cast");

    console.log("  Voter3 voting for Bob (ID: 2)...");
    tx = await votingContract.connect(voter3).voteForACandidate(2);
    await tx.wait();
    console.log("  ✅ Vote cast\n");

    // ==================== STEP 5: CHECK RESULTS ====================
    console.log("📊 STEP 5: Checking Results\n");

    const totalVotes = await votingContract.getTotalVotes();
    console.log("  Total votes cast:", totalVotes.toString());

    const alice = await votingContract.getCandidate(1);
    console.log(`  Alice: ${alice.score} votes`);

    const bob = await votingContract.getCandidate(2);
    console.log(`  Bob: ${bob.score} votes`);

    const charlie = await votingContract.getCandidate(3);
    console.log(`  Charlie: ${charlie.score} votes\n`);

    // ==================== STEP 6: TEST FAILURE CASES ====================
    console.log("❌ STEP 6: Testing Failure Cases\n");

    // Test: Double voting
    console.log("  Test: Voter1 tries to vote again...");
    try {
      await votingContract.connect(voter1).voteForACandidate(2);
      console.log("  ⚠️  ERROR: Should have failed!");
    } catch (error: any) {
      const errorMsg = error.message.includes("'") 
        ? error.message.split("'")[1] 
        : "You have already voted";
      console.log("  ✅ Correctly prevented:", errorMsg);
    }

    // Test: Unregistered voter
    console.log("  Test: Unregistered account tries to vote...");
    const signers = await ethers.getSigners();
    const unregistered = signers[4];
    try {
      await votingContract.connect(unregistered).voteForACandidate(1);
      console.log("  ⚠️  ERROR: Should have failed!");
    } catch (error: any) {
      const errorMsg = error.message.includes("'") 
        ? error.message.split("'")[1] 
        : "Voter is not registered";
      console.log("  ✅ Correctly prevented:", errorMsg);
    }

    console.log("");

    // ==================== STEP 7: CLOSE VOTING ====================
    console.log("🔒 STEP 7: Closing Voting\n");

    tx = await votingContract.connect(owner).closeVoting();
    await tx.wait();
    console.log("  ✅ Voting closed");

    const stillActive = await votingContract.isVotingActive();
    console.log("  Voting active:", stillActive);
    console.log("");

    // ==================== STEP 8: TEST VOTING AFTER CLOSE ====================
    console.log("❌ STEP 8: Testing Voting After Close\n");

    const lateVoter = signers[5];
    console.log("  Test: Trying to vote after voting closed...");
    
    // Register the late voter first
    tx = await votingContract.connect(lateVoter).registerAVoter();
    await tx.wait();
    
    try {
      await votingContract.connect(lateVoter).voteForACandidate(1);
      console.log("  ⚠️  ERROR: Should have failed!");
    } catch (error: any) {
      const errorMsg = error.message.includes("'") 
        ? error.message.split("'")[1] 
        : "Voting is not currently open";
      console.log("  ✅ Correctly prevented:", errorMsg);
    }
    console.log("");

    // ==================== STEP 9: DECLARE WINNER ====================
    console.log("🏆 STEP 9: Declaring Winner\n");

    const winner = await votingContract.getCandidateWithHighestVote();
    console.log(`  Winner: ${winner.name} with ${winner.score} votes`);

    tx = await votingContract.connect(owner).declareWinner();
    await tx.wait();
    console.log("  ✅ Winner officially declared\n");

    // ==================== FINAL SUMMARY ====================
    console.log("📋 FINAL SUMMARY\n");
    
    const stats = await votingContract.getVotingStats();
    console.log("  Total Candidates:", stats.totalCandidates.toString());
    console.log("  Total Votes:", stats.totalVotes.toString());
    console.log("  Voting Open:", stats.isOpen);
    console.log("  Time Remaining:", stats.timeRemaining.toString(), "seconds");
    console.log("");

    console.log("✅ All interactions completed successfully!");

  } catch (error: any) {
    console.error("\n❌ Error occurred:", error);
    throw error;
  }
}

// Execute interaction script
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });