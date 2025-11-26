// ============================================
// COMPREHENSIVE TEST SUITE
// File: test/VotingContract.test.ts
// ============================================

// import { expect } from "chai";
import { expect } from "chai";
import { ContractTransactionResponse } from "ethers";
import hre from "hardhat";
import  { parseEther  }  from "viem";

describe("VotingContract", function () {
  let votingContract: any;
  let owner: any;
  let voter1: any;
  let voter2: any;
  let voter3: any;
  let nonOwner: any;

  // Deploy fresh contract before each test
  beforeEach(async function () {
  const [owner, voter1, voter2, voter3, nonOwner] = await hre.viem.getSigners();
    
    const VotingContract = await ethers.getContractFactory("VotingContract");
    votingContract = await VotingContract.deploy();
    await votingContract.deployed();

  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await votingContract.owner()).to.equal(owner.address);
    });

    it("Should initialize with no candidates", async function () {
      expect(await votingContract.candidateCount()).to.equal(1); // Starts at 1
    });

    it("Should initialize with voting closed", async function () {
      expect(await votingContract.votingOpen()).to.equal(false);
    });

    it("Should initialize with zero total votes", async function () {
      expect(await votingContract.totalVotesCast()).to.equal(0);
    });
  });

  describe("Candidate Registration", function () {
    it("Should allow owner to register a candidate", async function () {
      await votingContract.connect(owner).registerCandidate("Alice");
      
      const candidate = await votingContract.getCandidate(1);
      expect(candidate.name).to.equal("Alice");
      expect(candidate.score).to.equal(0);
      expect(candidate.id).to.equal(1);
    });

    it("Should emit CandidateRegistered event", async function () {
      await expect(votingContract.connect(owner).registerCandidate("Alice"))
        .to.emit(votingContract, "CandidateRegistered")
        .withArgs("Alice", 1);
    });

    it("Should increment candidate count", async function () {
      await votingContract.connect(owner).registerCandidate("Alice");
      await votingContract.connect(owner).registerCandidate("Bob");
      
      expect(await votingContract.candidateCount()).to.equal(3); // 1 + 2 candidates
    });

    it("Should reject candidate registration from non-owner", async function () {
      await expect(
        votingContract.connect(nonOwner).registerCandidate("Alice")
      ).to.be.revertedWith("Only owner can perform this action");
    });

    it("Should reject empty candidate name", async function () {
      await expect(
        votingContract.connect(owner).registerCandidate("")
      ).to.be.revertedWith("Candidate name cannot be empty");
    });

    it("Should reject candidate registration while voting is open", async function () {
      await votingContract.connect(owner).registerCandidate("Alice");
      await votingContract.connect(owner).openVoting(300);
      
      await expect(
        votingContract.connect(owner).registerCandidate("Bob")
      ).to.be.revertedWith("Cannot register candidates while voting is open");
    });

    it("Should return candidate info correctly", async function () {
      await votingContract.connect(owner).registerCandidate("Alice");
      const candidate = await votingContract.getCandidate(1);
      expect(candidate.name).to.equal("Alice");
    });
  });

  describe("Voting Control", function () {
    beforeEach(async function () {
      // Register some candidates
      await votingContract.connect(owner).registerCandidate("Alice");
      await votingContract.connect(owner).registerCandidate("Bob");
    });

    it("Should allow owner to open voting", async function () {
      await votingContract.connect(owner).openVoting(300);
      expect(await votingContract.votingOpen()).to.equal(true);
    });

    it("Should emit VotingOpened event", async function () {
      await expect(votingContract.connect(owner).openVoting(300))
        .to.emit(votingContract, "VotingOpened");
    });

    it("Should reject opening voting without candidates", async function () {
      const VotingContract = await ethers.getContractFactory("VotingContract");
      const freshContract = await VotingContract.deploy() as VotingContract;
      await freshContract.deployed();
      
      await expect(
        freshContract.connect(owner).openVoting(300)
      ).to.be.revertedWith("Must have at least one candidate");
    });

    it("Should reject opening voting when already open", async function () {
      await votingContract.connect(owner).openVoting(300);
      
      await expect(
        votingContract.connect(owner).openVoting(300)
      ).to.be.revertedWith("Voting is already open");
    });

    it("Should reject non-owner opening voting", async function () {
      await expect(
        votingContract.connect(nonOwner).openVoting(300)
      ).to.be.revertedWith("Only owner can perform this action");
    });

    it("Should allow owner to close voting", async function () {
      await votingContract.connect(owner).openVoting(300);
      await votingContract.connect(owner).closeVoting();
      
      expect(await votingContract.votingOpen()).to.equal(false);
    });

    it("Should emit VotingClosed event", async function () {
      await votingContract.connect(owner).openVoting(300);
      
      await expect(votingContract.connect(owner).closeVoting())
        .to.emit(votingContract, "VotingClosed");
    });

    it("Should reject non-owner closing voting", async function () {
      await votingContract.connect(owner).openVoting(300);
      
      await expect(
        votingContract.connect(nonOwner).closeVoting()
      ).to.be.revertedWith("Only owner can perform this action");
    });

    it("Should correctly report voting active status", async function () {
      expect(await votingContract.isVotingActive()).to.equal(false);
      
      await votingContract.connect(owner).openVoting(300);
      expect(await votingContract.isVotingActive()).to.equal(true);
      
      await votingContract.connect(owner).closeVoting();
      expect(await votingContract.isVotingActive()).to.equal(false);
    });

    it("Should correctly report remaining time", async function () {
      await votingContract.connect(owner).openVoting(300);
      const remaining = await votingContract.getRemainingTime();
      
      expect(remaining).to.be.gte(295); // Allow for some block time
      expect(remaining).to.be.lte(300);
    });
  });

  describe("Voter Registration", function () {
    it("Should allow anyone to register as voter", async function () {
      await votingContract.connect(voter1).registerAVoter();
      
      expect(await votingContract.registeredVoters(voter1.address)).to.equal(true);
    });

    it("Should correctly check voter registration status", async function () {
      await votingContract.connect(voter1).registerAVoter();
      
      expect(await votingContract.checkIfVoterIsRegistered(voter1.address)).to.equal(true);
      expect(await votingContract.checkIfVoterIsRegistered(voter2.address)).to.equal(false);
    });

    it("Should reject duplicate voter registration", async function () {
      await votingContract.connect(voter1).registerAVoter();
      
      await expect(
        votingContract.connect(voter1).registerAVoter()
      ).to.be.revertedWith("Already registered");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      // Setup: Register candidates and open voting
      await votingContract.connect(owner).registerCandidate("Alice");
      await votingContract.connect(owner).registerCandidate("Bob");
      await votingContract.connect(owner).openVoting(300);
      
      // Register voters
      await votingContract.connect(voter1).registerAVoter();
      await votingContract.connect(voter2).registerAVoter();
    });

    it("Should allow registered voter to vote", async function () {
      await votingContract.connect(voter1).voteForACandidate(1);
      
      const candidate = await votingContract.getCandidate(1);
      expect(candidate.score).to.equal(1);
    });

    it("Should emit UserVoted event", async function () {
      await expect(votingContract.connect(voter1).voteForACandidate(1))
        .to.emit(votingContract, "UserVoted")
        .withArgs(voter1.address, 1, "Alice");
    });

    it("Should increment total votes", async function () {
      await votingContract.connect(voter1).voteForACandidate(1);
      await votingContract.connect(voter2).voteForACandidate(2);
      
      expect(await votingContract.getTotalVotes()).to.equal(2);
    });

    it("Should mark voter as having voted", async function () {
      await votingContract.connect(voter1).voteForACandidate(1);
      
      expect(await votingContract.hasVoted(voter1.address)).to.equal(true);
    });

    it("Should reject vote from unregistered voter", async function () {
      await expect(
        votingContract.connect(voter3).voteForACandidate(1)
      ).to.be.revertedWith("Voter is not registered");
    });

    it("Should reject double voting", async function () {
      await votingContract.connect(voter1).voteForACandidate(1);
      
      await expect(
        votingContract.connect(voter1).voteForACandidate(2)
      ).to.be.revertedWith("You have already voted");
    });

    it("Should reject vote for invalid candidate ID", async function () {
      await expect(
        votingContract.connect(voter1).voteForACandidate(999)
      ).to.be.revertedWith("Invalid candidate ID");
    });

    it("Should reject vote when voting is closed", async function () {
      await votingContract.connect(owner).closeVoting();
      
      await expect(
        votingContract.connect(voter1).voteForACandidate(1)
      ).to.be.revertedWith("Voting is not currently open");
    });

    it("Should correctly tally votes for multiple candidates", async function () {
      await votingContract.connect(voter1).voteForACandidate(1); // Alice
      await votingContract.connect(voter2).voteForACandidate(1); // Alice
      
      await votingContract.connect(voter3).registerAVoter();
      await votingContract.connect(voter3).voteForACandidate(2); // Bob
      
      const alice = await votingContract.getCandidate(1);
      const bob = await votingContract.getCandidate(2);
      
      expect(alice.score).to.equal(2);
      expect(bob.score).to.equal(1);
    });
  });

  describe("Results and Winner", function () {
    beforeEach(async function () {
      // Setup complete voting cycle
      await votingContract.connect(owner).registerCandidate("Alice");
      await votingContract.connect(owner).registerCandidate("Bob");
      await votingContract.connect(owner).registerCandidate("Charlie");
      await votingContract.connect(owner).openVoting(300);
      
      // Register voters and vote
      await votingContract.connect(voter1).registerAVoter();
      await votingContract.connect(voter2).registerAVoter();
      await votingContract.connect(voter3).registerAVoter();
      
      await votingContract.connect(voter1).voteForACandidate(1); // Alice
      await votingContract.connect(voter2).voteForACandidate(1); // Alice
      await votingContract.connect(voter3).voteForACandidate(2); // Bob
      
      await votingContract.connect(owner).closeVoting();
    });

    it("Should correctly identify winner", async function () {
      const winner = await votingContract.getCandidateWithHighestVote();
      expect(winner.name).to.equal("Alice");
      expect(winner.score).to.equal(2);
    });

    it("Should allow owner to declare winner", async function () {
      await votingContract.connect(owner).declareWinner();
      
      const alice = await votingContract.getCandidate(1);
      expect(alice.winner).to.equal(true);
    });

    it("Should emit CandidateWon event", async function () {
      await expect(votingContract.connect(owner).declareWinner())
        .to.emit(votingContract, "CandidateWon")
        .withArgs("Alice", 1);
    });

    it("Should reject declaring winner while voting open", async function () {
      await votingContract.connect(owner).openVoting(300);
      
      await expect(
        votingContract.connect(owner).declareWinner()
      ).to.be.revertedWith("Voting is still open");
    });

    it("Should reject non-owner declaring winner", async function () {
      await expect(
        votingContract.connect(nonOwner).declareWinner()
      ).to.be.revertedWith("Only owner can perform this action");
    });

    it("Should provide accurate voting statistics", async function () {
      const stats = await votingContract.getVotingStats();
      
      expect(stats.totalCandidates).to.equal(3);
      expect(stats.totalVotes).to.equal(3);
      expect(stats.isOpen).to.equal(false);
      expect(stats.timeRemaining).to.equal(0);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle single candidate election", async function () {
      await votingContract.connect(owner).registerCandidate("OnlyOne");
      await votingContract.connect(owner).openVoting(300);
      
      await votingContract.connect(voter1).registerAVoter();
      await votingContract.connect(voter1).voteForACandidate(1);
      
      await votingContract.connect(owner).closeVoting();
      
      const winner = await votingContract.getCandidateWithHighestVote();
      expect(winner.name).to.equal("OnlyOne");
    });

    it("Should handle tie scenario correctly", async function () {
      await votingContract.connect(owner).registerCandidate("Alice");
      await votingContract.connect(owner).registerCandidate("Bob");
      await votingContract.connect(owner).openVoting(300);
      
      await votingContract.connect(voter1).registerAVoter();
      await votingContract.connect(voter2).registerAVoter();
      
      await votingContract.connect(voter1).voteForACandidate(1);
      await votingContract.connect(voter2).voteForACandidate(2);
      
      const winner = await votingContract.getCandidateWithHighestVote();
      // In case of tie, first candidate with max votes wins
      expect(winner.name).to.equal("Alice");
    });

    it("Should handle zero votes scenario", async function () {
      await votingContract.connect(owner).registerCandidate("Alice");
      await votingContract.connect(owner).openVoting(300);
      await votingContract.connect(owner).closeVoting();
      
      await expect(
        votingContract.connect(owner).declareWinner()
      ).to.be.revertedWith("No votes were cast");
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for voting", async function () {
      await votingContract.connect(owner).registerCandidate("Alice");
      await votingContract.connect(owner).openVoting(300);
      await votingContract.connect(voter1).registerAVoter();
      
      const tx: ContractTransactionResponse | null = await votingContract.connect(voter1).voteForACandidate(1);
      const receipt = await tx?.wait();
      
      console.log("      Gas used for voting:", receipt?.gasUsed.toString());
      expect(receipt?.gasUsed).to.be.lt(100000); // Should be less than 100k gas
    });
  });
});