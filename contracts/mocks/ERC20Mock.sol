// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    uint8 internal _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 totalSupply
    ) ERC20(name, symbol) {
        _decimals = decimals;
        _mint(msg.sender, totalSupply);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
