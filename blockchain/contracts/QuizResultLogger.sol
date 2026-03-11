// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract QuizResultLogger {
    
    // Event to log the attempt details
    event QuizAttemptLogged(
        string indexed userId,
        string indexed quizId,
        uint256 score,
        uint256 timestamp,
        bytes32 attemptHash
    );

    // Function to log the attempt
    // We don't necessarily need to store the full struct if we just want a tamper-proof log, 
    // but storing the hash is good for verification.
    mapping(bytes32 => bool) public validAttempts;

    function logAttempt(string memory _userId, string memory _quizId, uint256 _score, uint256 _timestamp) public {
        // Create a unique hash for this attempt
        bytes32 attemptHash = keccak256(abi.encodePacked(_userId, _quizId, _score, _timestamp));
        
        // Store it to prevent double submission (optional logic) or just to verify existence later
        validAttempts[attemptHash] = true;

        emit QuizAttemptLogged(_userId, _quizId, _score, _timestamp, attemptHash);
    }

    // specific verification function
    function verifyAttempt(string memory _userId, string memory _quizId, uint256 _score, uint256 _timestamp) public view returns (bool) {
        bytes32 attemptHash = keccak256(abi.encodePacked(_userId, _quizId, _score, _timestamp));
        return validAttempts[attemptHash];
    }
}
