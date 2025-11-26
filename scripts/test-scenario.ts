import hre from "hardhat";
import * as fs from "fs";
import { Address } from "viem";

interface DeploymentInfo {
  contractAddress: Address;
  network: string;
  deployer: string;
  deploymentTime: string;
  blockNumber: string;
}

async function main(): Promise<void> {
  console.log("🗳️  Starting Voting Contract Interaction\n");

  // Load deployment info
  const deploymentData = fs.readFileSync("deployment-info.json", "utf8");
  const deploymentInfo: DeploymentInfo = JSON.parse(deploymentData);
  const contractAddress = deploymentInfo.contractAddress;

  // Get wallet clients and public client
  const [owner, voter1, voter2, voter3] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  console.log("👥 Accounts:");
  console.log("  Owner:", owner.account.address);
  console.log("  Voter1:", voter1.account.address);
  console.log("  Voter2:", voter2.account.address);
  console.log("  Voter3:", voter3.account.address);
  console.log("");

  // Get contract instance
  const votingContract = await hre.viem.getContractAt(
    "VotingContract",
    contractAddress
  );

  try {
    // ==================== STEP 1: REGISTER CANDIDATES ====================
    console.log("📝 STEP 1: Registering Candidates\n");

    console.log("  Registering Alice...");
    let hash = await votingContract.write.registerCandidate(["Alice"], {
      account: owner.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Alice registered");

    console.log("  Registering Bob...");
    hash = await votingContract.write.registerCandidate(["Bob"], {
      account: owner.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Bob registered");

    console.log("  Registering Charlie...");
    hash = await votingContract.write.registerCandidate(["Charlie"], {
      account: owner.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Charlie registered\n");

    // Get candidate count
    const candidateCount = await votingContract.read.candidateCount();
    console.log("  Total candidates registered:", (candidateCount - 1n).toString());
    console.log("");

    // ==================== STEP 2: OPEN VOTING ====================
    console.log("🔓 STEP 2: Opening Voting\n");

    const votingDuration = 600n; // 10 minutes
    hash = await votingContract.write.openVoting([votingDuration], {
      account: owner.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✅ Voting opened for ${votingDuration} seconds (${Number(votingDuration)/60} minutes)`);
    
    const isActive = await votingContract.read.isVotingActive();
    console.log("  Voting active:", isActive);
    console.log("");

    // ==================== STEP 3: REGISTER VOTERS ====================
    console.log("👥 STEP 3: Registering Voters\n");

    console.log("  Registering Voter1...");
    hash = await votingContract.write.registerAVoter([], {
      account: voter1.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Voter1 registered");

    console.log("  Registering Voter2...");
    hash = await votingContract.write.registerAVoter([], {
      account: voter2.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Voter2 registered");

    console.log("  Registering Voter3...");
    hash = await votingContract.write.registerAVoter([], {
      account: voter3.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Voter3 registered\n");

    // ==================== STEP 4: CAST VOTES ====================
    console.log("🗳️  STEP 4: Casting Votes\n");

    console.log("  Voter1 voting for Alice (ID: 1)...");
    hash = await votingContract.write.voteForACandidate([1n], {
      account: voter1.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Vote cast");

    console.log("  Voter2 voting for Alice (ID: 1)...");
    hash = await votingContract.write.voteForACandidate([1n], {
      account: voter2.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Vote cast");

    console.log("  Voter3 voting for Bob (ID: 2)...");
    hash = await votingContract.write.voteForACandidate([2n], {
      account: voter3.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Vote cast\n");

    // ==================== STEP 5: CHECK RESULTS ====================
    console.log("📊 STEP 5: Checking Results\n");

    const totalVotes = await votingContract.read.getTotalVotes();
    console.log("  Total votes cast:", totalVotes.toString());

    const alice = await votingContract.read.getCandidate([1n]);
    console.log(`  Alice: ${alice[2]} votes`); // alice[2] is score

    const bob = await votingContract.read.getCandidate([2n]);
    console.log(`  Bob: ${bob[2]} votes`);

    const charlie = await votingContract.read.getCandidate([3n]);
    console.log(`  Charlie: ${charlie[2]} votes\n`);

    // ==================== STEP 6: TEST FAILURE CASES ====================
    console.log("❌ STEP 6: Testing Failure Cases\n");

    // Test: Double voting
    console.log("  Test: Voter1 tries to vote again...");
    try {
      await votingContract.write.voteForACandidate([2n], {
        account: voter1.account,
      });
      console.log("  ⚠️  ERROR: Should have failed!");
    } catch (error: any) {
      const errorMsg = error.message.includes("already voted") 
        ? "You have already voted" 
        : "Transaction reverted";
      console.log("  ✅ Correctly prevented:", errorMsg);
    }

    // Test: Unregistered voter
    console.log("  Test: Unregistered account tries to vote...");
    const wallets = await hre.viem.getWalletClients();
    const unregistered = wallets[4];
    try {
      await votingContract.write.voteForACandidate([1n], {
        account: unregistered.account,
      });
      console.log("  ⚠️  ERROR: Should have failed!");
    } catch (error: any) {
      const errorMsg = error.message.includes("not registered") 
        ? "Voter is not registered" 
        : "Transaction reverted";
      console.log("  ✅ Correctly prevented:", errorMsg);
    }

    console.log("");

    // ==================== STEP 7: CLOSE VOTING ====================
    console.log("🔒 STEP 7: Closing Voting\n");

    hash = await votingContract.write.closeVoting([], {
      account: owner.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Voting closed");

    const stillActive = await votingContract.read.isVotingActive();
    console.log("  Voting active:", stillActive);
    console.log("");

    // ==================== STEP 8: TEST VOTING AFTER CLOSE ====================
    console.log("❌ STEP 8: Testing Voting After Close\n");

    const lateVoter = wallets[5];
    console.log("  Test: Trying to vote after voting closed...");
    
    // Register the late voter first
    hash = await votingContract.write.registerAVoter([], {
      account: lateVoter.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    
    try {
      await votingContract.write.voteForACandidate([1n], {
        account: lateVoter.account,
      });
      console.log("  ⚠️  ERROR: Should have failed!");
    } catch (error: any) {
      const errorMsg = error.message.includes("not currently open") 
        ? "Voting is not currently open" 
        : "Transaction reverted";
      console.log("  ✅ Correctly prevented:", errorMsg);
    }
    console.log("");

    // ==================== STEP 9: DECLARE WINNER ====================
    console.log("🏆 STEP 9: Declaring Winner\n");

    const winner = await votingContract.read.getCandidateWithHighestVote();
    console.log(`  Winner: ${winner[1]} with ${winner[2]} votes`); // winner[1] is name, winner[2] is score

    hash = await votingContract.write.declareWinner([], {
      account: owner.account,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  ✅ Winner officially declared\n");

    // ==================== FINAL SUMMARY ====================
    console.log("📋 FINAL SUMMARY\n");
    
    const stats = await votingContract.read.getVotingStats();
    console.log("  Total Candidates:", stats[0].toString());
    console.log("  Total Votes:", stats[1].toString());
    console.log("  Voting Open:", stats[2]);
    console.log("  Time Remaining:", stats[3].toString(), "seconds");
    console.log("");

    console.log("✅ All interactions completed successfully!");

  } catch (error: any) {
    console.error("\n❌ Error occurred:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
