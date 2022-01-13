// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/interfaces/IERC721Metadata.sol";

interface IUniverseToken is IERC721Metadata {
    /**
     * @dev Mints new token and transfers it to `to` address.
     * @return Minted token ID.
     */
    function mint(address to) external returns (uint256);
}
