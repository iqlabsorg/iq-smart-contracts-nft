// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IMetahub {
    /**
     * @dev Emitted when a new warper is registered.
     * @param universeId Universe ID.
     * @param original Original asset contract address.
     * @param warper Warper address.
     */
    event WarperRegistered(uint256 indexed universeId, address indexed original, address indexed warper);

    /**
     * @dev Emitted when a universe is created.
     * @param universeId Universe ID.
     * @param name Universe name.
     */
    event UniverseCreated(uint256 indexed universeId, string name);

    /**
     * @dev Deploys a preset warper identified by `presetId`.
     * @param universeId Universe ID.
     * @param original Original asset contract address.
     * @param presetId Warper preset ID.
     * @return Warper address.
     */
    function deployWarper(
        uint256 universeId,
        address original,
        bytes32 presetId
    ) external returns (address);

    /**
     * @dev Deploys a preset warper identified by `presetId`, and performs additional setup call.
     * @param universeId Universe ID.
     * @param original Original asset contract address.
     * @param presetId Warper preset ID.
     * @param presetData Warper preset setup call.
     * @return Warper address.
     */
    function deployWarperAndCall(
        uint256 universeId,
        address original,
        bytes32 presetId,
        bytes calldata presetData
    ) external returns (address);

    /**
     * @dev Creates new Universe. This includes minting new universe NFT, where the caller of this method becomes the universe owner.
     * @param name Universe name.
     * @return Universe ID (universe token ID).
     */
    function createUniverse(string calldata name) external returns (uint256);

    /**
     * @dev Returns warper preset factory address.
     */
    function warperPresetFactory() external view returns (address);

    /**
     * @dev Returns the list of warpers belonging to the particular universe.
     * @param universeId The universe ID.
     * @return List of warper addresses.
     */
    function universeWarpers(uint256 universeId) external view returns (address[] memory);

    /**
     * @dev Returns the list of warpers associated wit the particular original asset.
     * @param original Original asset address.
     * @return List of warper addresses.
     */
    function assetWarpers(address original) external view returns (address[] memory);
}
