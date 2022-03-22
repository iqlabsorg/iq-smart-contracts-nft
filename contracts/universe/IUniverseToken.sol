// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/interfaces/IERC721MetadataUpgradeable.sol";

interface IUniverseToken is IERC721MetadataUpgradeable {
    /**
     * @dev Mints new token and transfers it to `to` address.
     * @param to Universe owner address.
     * @param universeName Universe name.
     * @return Minted token ID.
     */
    function mint(address to, string calldata universeName) external returns (uint256);

    /**
     * @dev Returns the Universe name associated with token ID.
     * @param tokenId Universe token ID.
     * @return Universe name.
     */
    function universeName(uint256 tokenId) external view returns (string memory);
}
