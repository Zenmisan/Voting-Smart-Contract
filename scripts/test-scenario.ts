// ============================================
// TESTING SPECIFIC SCENARIOS
// File: scripts/test-scenarios.ts
// ============================================

import ethers from "hardhat";
import { VotingContract } from "../typechain-types/index.js";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

async function testScenario(
  description: string, 
  testFunction: () => Promise<void>
): Promise<boolean> {
  console.log(`\n🧪 Testing: ${description}`);
  try {
    await testFunction();
    console.log("✅ PASSED");
    return true;
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    return false;
  }
}

async function main(): Promise<void> {
  console.log("🧪 Running Test Scenarios\n");

  const [owner, voter1, voter2]: SignerWithAddress[] = await ethers.getSigners();
  
  // Deploy fresh contract
  const VotingContract = await ethers.getContractFactory("VotingContract");
  const votingContract = await VotingContract.deploy() as VotingContract;
  await votingContract.deployed();

  let passCount = 0;
  let totalTests = 0;

  // Test 1: Non-owner cannot register candidate
  totalTests++;
  if (await testScenario("Non-owner cannot register candidate", async () => {
    await votingContract.connect(voter1).registerCandidate("Alice");
    throw new Error("Should have reverted");
  })) passCount++;

  // Test 2: Owner can register candidate
  totalTests++;
  if (await testScenario("Owner can register candidate", async () => {
    await votingContract.connect(owner).registerCandidate("Alice");
  })) passCount++;

  // Test 3: Cannot open voting without candidates
  totalTests++;
  const contract2 = await VotingContract.deploy() as VotingContract;
  await contract2.deployed();
  if (await testScenario("Cannot open voting without candidates", async () => {
    await contract2.connect(owner).openVoting(300);
    throw new Error("Should have reverted");
  })) passCount++;

  // Test 4: Cannot vote without registration
  totalTests++;
  if (await testScenario("Cannot vote without voter registration", async () => {
    await votingContract.connect(owner).openVoting(300);
    await votingContract.connect(voter1).voteForACandidate(1);
    throw new Error("Should have reverted");
  })) passCount++;

  // Test 5: Successful voting
  totalTests++;
  if (await testScenario("Registered voter can vote successfully", async () => {
    await votingContract.connect(voter1).registerAVoter();
    await votingContract.connect(voter1).voteForACandidate(1);
  })) passCount++;

  // Test 6: Cannot vote twice
  totalTests++;
  if (await testScenario("Voter cannot vote twice", async () => {
    await votingContract.connect(voter1).voteForACandidate(1);
    throw new Error("Should have reverted");
  })) passCount++;

  // Test 7: Cannot vote after closing
  totalTests++;
  if (await testScenario("Cannot vote after voting closed", async () => {
    await votingContract.connect(voter2).registerAVoter();
    await votingContract.connect(owner).closeVoting();
    await votingContract.connect(voter2).voteForACandidate(1);
    throw new Error("Should have reverted");
  })) passCount++;

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`📊 Test Results: ${passCount}/${totalTests} passed`);
  console.log("=".repeat(50) + "\n");

  if (passCount === totalTests) {
    console.log("🎉 All tests passed!");
  } else {
    console.log(`⚠️  ${totalTests - passCount} test(s) failed`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });