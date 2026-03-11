// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

// Decentralized Identity Registry
contract AcademicIdentity is Ownable {
    constructor() Ownable(msg.sender) {}
    struct Identity {
        string did; // w3c did string e.g., did:tidal:12345...
        string profileHash; // IPFS hash of profile data
        bool isVerified;
        uint256 verificationDate;
    }

    mapping(address => Identity) public identities;
    mapping(string => address) public didToAddress;

    event IdentityRegistered(address indexed user, string did);
    event IdentityVerified(address indexed user);

    function registerIdentity(string memory _did, string memory _profileHash) public {
        require(bytes(identities[msg.sender].did).length == 0, "Identity already registered");
        require(didToAddress[_did] == address(0), "DID already claimed");

        identities[msg.sender] = Identity({
            did: _did,
            profileHash: _profileHash,
            isVerified: false,
            verificationDate: 0
        });

        didToAddress[_did] = msg.sender;
        emit IdentityRegistered(msg.sender, _did);
    }

    function verifyIdentity(address _user) public onlyOwner {
        require(bytes(identities[_user].did).length > 0, "No identity found");
        identities[_user].isVerified = true;
        identities[_user].verificationDate = block.timestamp;
        
        emit IdentityVerified(_user);
    }
    
    function updateProfileHash(string memory _newHash) public {
        require(bytes(identities[msg.sender].did).length > 0, "No identity found");
        identities[msg.sender].profileHash = _newHash;
    }

    function getIdentity(address _user) public view returns (Identity memory) {
        return identities[_user];
    }
}
