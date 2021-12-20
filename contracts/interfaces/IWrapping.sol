// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/interfaces/IERC165.sol";

interface IWrapping is IERC165 {
    //todo: events

    /**
     * @dev Returns the original NFT address.
     */
    function __original() external view returns (address);
}
