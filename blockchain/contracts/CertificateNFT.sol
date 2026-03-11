// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// Soulbound Token (SBT) Implementation for Academic Certificates
contract CertificateNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    struct CertificateData {
        string studentName;
        string courseName;
        uint256 score;
        uint256 issueDate;
    }

    mapping(uint256 => CertificateData) public certificates;

    event CertificateIssued(uint256 indexed tokenId, address indexed recipient, string courseName);

    constructor() ERC721("AI Proctroing ExamCertificate", "QQC") Ownable(msg.sender) {}

    function mintCertificate(
        address recipient,
        string memory tokenURI,
        string memory studentName,
        string memory courseName,
        uint256 score
    ) public onlyOwner returns (uint256) {
        uint256 newItemId = ++_nextTokenId;

        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        certificates[newItemId] = CertificateData({
            studentName: studentName,
            courseName: courseName,
            score: score,
            issueDate: block.timestamp
        });

        emit CertificateIssued(newItemId, recipient, courseName);
        return newItemId;
    }

    // Soulbound: Prevent Transfer (OZ 5.0 uses _update)
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("Err: This token is Soulbound and cannot be transferred");
        }
        return super._update(to, tokenId, auth);
    }
}
