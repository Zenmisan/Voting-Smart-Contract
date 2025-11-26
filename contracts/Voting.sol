// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Vote for a candidate
// Register a candidate
// Get all candidates
// Get candidate with the hughest votes
// Register a voter
// Check if voter is registered
// Check if voter has voted
// Votting period open/close
// Voting Duration
// Check if voting is active
// Get remaining time for voting
// Total votes cast
// Get voting statistics
// Declare winner
// Reset election 
// Available only to owner
// Tally votes for candidatesw2


/**
* @title Extended Voting Contract
* @notice A voting contract woth open/close functionality, vote tallying, and access restrictions
* @dev Inlclude modifiers for access control snd voting state management
*/ 

contract VotingContract {
    // Candidate Structure
    struct Candidate {
        uint256 id;
        string name;
        uint256 score;
        bool winner;
    }

    // Events
    event CandidateRegistered(string name, uint256 id);
    event CandidateWon(string name, uint256 id);
    event UserVoted(address indexed voter, uint256 candidateID, string name);
    event VotingOpened(uint256 startTime, uint256 endTime);
    event VotingClosed(uint256 closeTime);

    // State Variables
    address public owner;
    uint256 public candidateCount = 1;
    bool public votingOpen = false;
    uint256 public votingStartTime;
    uint256 public votingEndTime;
    uint256 public totalVotesCast = 0;


    //Storing of candidates
    mapping (uint256 => Candidate) public candidates;
    Candidate[] public candidateArray;

    // mapaping 
    mapping(address => bool) public registeredVoters;
    mapping(address => bool) public hasVoted;

    // Modifiers
    modifier onlyOwner(){
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyWhenVotingOpen(){
        require (votingOpen, "Voting is not currently open" );
        require (block.timestamp >= votingStartTime, "Voting has not started yet");
        require (block.timestamp <= votingEndTime, "Voting has ended");
        _;
    }
    modifier onlyWhenVotingClosed() {
        require(!votingOpen, "Voting is still open");
        _;
    }
    constructor() {
        owner = msg.sender;
    }

// // // // // =========Candidate Mangement============ // // // // //

    /**
    *@notice Register a New candidate (Admin only, only when voting is closed)
    *@param _name Name of the canidate
    * @return name, id of the registered candidaate
     */

    function registerCandidate(string memory _name) public onlyOwner returns (string memory, uint256) {
        require(!votingOpen, "Cannot register candidates while voting is open");
        require(bytes(_name).length > 0, "Candidate name cannot be empty");

        Candidate memory newCandidate = Candidate(candidateCount, _name, 0, false);
        candidateArray.push(newCandidate);
        candidates[candidateCount] = newCandidate;

        // Boradcast a candidate has been registered
        emit CandidateRegistered(_name, candidateCount); 
        candidateCount++;
        return (_name, candidateCount - 1);

    }
    /**
    * @notice Get candidate details by ID
    * @param _id Candidate ID
    * @return Candidate details
     */

    function getCandidate(uint256 _id) public view returns (Candidate memory){
        require(_id > 0 && _id < candidateCount, "Invalid candidate ID");
        return candidates[_id];

    }

    /**
    *@notice Get all candidates
    * @return Array of all candidates 
    */
    function getAllCandidates() public view returns (Candidate[] memory){
        return candidateArray;
    }   
    /**
    *@notice Get candidate with the highest number of votes
    *@return Candidate with most votes
     */
     
    function getCandidateWithHighestVote() public view returns (Candidate memory)
    {
        require(candidateArray.length > 0, "No candidate registered");

        uint256 initialMaxVote = candidateArray[0].score;
        uint256 winnerId = candidateArray[0].id;

        for (uint256 i = 1; i < candidateArray.length; i++){
            if (candidateArray[i].score > initialMaxVote) {
                initialMaxVote = candidateArray[i].score;
                winnerId = candidateArray[i].id;
            }

    }
    return candidates[winnerId];
}

// // // // // ==========Voting Control============= // // // // // 
/**
* @notice Open voting for a specific duration
* @param _durationInSeconds Duration in seconds (ie, 300 = 5 mins)
 */
 function openVoting(uint256 _durationInSeconds) public onlyOwner {
    require(!votingOpen, "Voting is already open");
    require(candidateArray.length > 0, "Must have at least one candidate");
    require(_durationInSeconds > 0, "Duration must be greater than 0");

    votingOpen = true;
    votingStartTime = block.timestamp;
    votingEndTime = block.timestamp + _durationInSeconds;

    emit VotingOpened(votingStartTime, votingEndTime);
 }

 /**
 * @notice Close voting manually (owner can end the voting early)
  */

  function closeVoting() public onlyOwner {
    require(votingOpen, "Voting is closed already");
    votingOpen = false;
    emit VotingClosed(block.timestamp);
  }

/**
* @notice Check if voting is currently active
* @return true if voting is open and within time window 
 */

 function isVotingActive() public view returns (bool) {
    return votingOpen &&
              block.timestamp >= votingStartTime &&
              block.timestamp <= votingEndTime;
 }
 

// // // // // =========Voting Management============= // // // // // 

/**
* @notice Register caller as a voter 
*/

function registerAVoter() public {
    require(!registeredVoters[msg.sender], "Already registered");
    registeredVoters[msg.sender] = true;
}

/**
* @notice Check if an address is a registered voter
* @param voter Address to check 
* @return true if registered
 */
function checkIfVoterIsRegistered(address voter) public view returns (bool){
    return registeredVoters[voter];
}

/** 
* @notice Check if an address has already voted
* @param voter Address to check
* @return true if voted 
*/
function checkIfVoterHasVoted(address voter) public view returns (bool){
    return hasVoted[voter];
}

// // // // // ==========Voting Process============= // // // // // 
/**
* @notice Vote foor a candidate
* @param id Candidate ID to vote for
*/
function voteForACandidate(uint256 id) public onlyWhenVotingOpen{
    require(registeredVoters[msg.sender], "Voter is not registered");
    require(!hasVoted[msg.sender], "You have already voted");
    require(id > 0 && id < candidateCount, "Invalid candidate ID");
    hasVoted[msg.sender]= true;
    totalVotesCast++;

    // require(registeredVoters{msg.sender}, "Voter is not registered");

    Candidate storage candidateToVote = candidates[id];
    candidateToVote.score +=1;

    // candidates[id] = candidateToVote;

    emit UserVoted(msg.sender, id, candidateToVote.name);  

      // Candidate memory candidateToVote = candidate[id]; // Get the candidate
    // candidateToVote.score += 1; 

}
// // // // // // // ========= Result & Stats ============= // // // // // // 

/**
* @notice Get total number of votes cast
* @return Total votes
 */
    function getTotalVotesCast() public view returns (uint256) {
        return totalVotesCast;
    }

/**
* @notice Get total votes (alias for getTotalVotesCast)
* @return Total votes
*/
function getTotalVotes() public view returns (uint256) {
    return totalVotesCast;
}

/**
* @notice Get remaining voting time in seconds
* @return Time remaining, or 0 if voting is closed
*/
function getRemainingTime() public view returns (uint256) {
    return votingEndTime > block.timestamp ? votingEndTime - block.timestamp : 0;
}

/**
* @notice Get voting statistics
* @return totalCandidates Number of candidates
* @return totalVotes Total votes cast
* @return isOpen Whether voting is open
* @return timeRemaining Time remaining in voting period
*/
    function getVotingStats() public view returns (
        uint256 totalCandidates,
        uint256 totalVotes,
        bool isOpen,
        uint256 timeRemaining
    ){
        return (
        candidateArray.length,
        totalVotesCast,
        votingOpen,
        votingEndTime > block.timestamp ? votingEndTime - block.timestamp : 0
    );
    }    

    /**
    * @notice Declear the winner (only after voting is closed)
    * @return Winner candidate details
     */
     function declareWinner() public onlyOwner onlyWhenVotingClosed returns (Candidate memory) {
        require(candidateArray.length > 0, "No candidates");
        require(totalVotesCast > 0, "No votes were cast");
    
        Candidate storage winner = candidates[getCandidateWithHighestVote().id];
        winner.winner = true;

        emit CandidateWon(winner.name, winner.id);
        return winner;
     }
     /**
     * @notice Reset the contract for a new election (admin only, voting must be closed) 
     */

    function resetElection() public onlyOwner onlyWhenVotingClosed {
        // Reset voting state
        votingOpen = false;
        votingStartTime = 0;
        votingEndTime = 0;
        totalVotesCast = 0;

        // Clear candidates
        delete candidateArray;
        candidateCount = 1;

    }


}




