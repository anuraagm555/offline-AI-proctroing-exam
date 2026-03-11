// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Reputation Token for Gamification
contract TidalToken is ERC20, Ownable {
    mapping(address => uint256) public reputationScore;

    event ReputationUpdated(address indexed user, uint256 newScore);

    constructor() ERC20("TidalReputation", "TIDAL") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
        reputationScore[to] += amount;
        emit ReputationUpdated(to, reputationScore[to]);
    }

    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
        if (reputationScore[from] >= amount) {
            reputationScore[from] -= amount;
        } else {
            reputationScore[from] = 0;
        }
        emit ReputationUpdated(from, reputationScore[from]);
    }

    // Soulbound-ish: Optional - restrict transfer if tokens are purely reputation
    // For now, we allow transfers as "currency" but reputation score is sticky or separate?
    // Let's keep it simple: Tokens = Spendable Reward, Score needs to be tracked separately if we want it permanent.
    // Logic: Minting increases reputation. Spending (burning) decreases balance but arguably shouldn't decrease "lifetime earned"
    // For this implementation, we track 'reputationScore' as lifetime accumulated logic could be added.
}
