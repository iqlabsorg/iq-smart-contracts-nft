// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

// todo: add universe accessor?  universe(uint256 universeId) external returns (name, symbol, universeName)
interface IUniverseManager {
    /**
     * @dev Emitted when a universe is created.
     * @param universeId Universe ID.
     * @param name Universe name.
     */
    event UniverseCreated(uint256 indexed universeId, string name);

    /**
     * @dev Creates new Universe. This includes minting new universe NFT, where the caller of this method becomes the universe owner.
     * @param name Universe name.
     * @return Universe ID (universe token ID).
     */
    function createUniverse(string calldata name) external returns (uint256);
}
