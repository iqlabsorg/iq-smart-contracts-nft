// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IMetahub {
    /**
     * @dev Emitted when a warper is deployed.
     * @param original Original Asset contract address.
     * @param warper Warper address.
     */
    event WarperDeployed(address indexed original, address indexed warper);

    /**
     * @dev Emitted when a Universe is created.
     * @param universeId Universe ID.
     * @param name Universe name.
     */
    event UniverseCreated(string name, uint256 universeId);

    /**
     * @dev Deploys a preset warper identified by `presetId`.
     * @param presetId Warper preset ID.
     * @param original Original Asset contract address.
     * @return Warper address.
     */
    function deployWarper(bytes32 presetId, address original) external returns (address);

    /**
     * @dev Creates new Universe. This includes minting new universe NFT, where the caller of this method becomes the Universe owner.
     * @param name Universe name.
     * @return Universe ID (universe token ID).
     */
    function createUniverse(string calldata name) external returns (uint256);

    /**
     * @dev Returns warper preset factory address.
     */
    function warperPresetFactory() external view returns (address);
}
