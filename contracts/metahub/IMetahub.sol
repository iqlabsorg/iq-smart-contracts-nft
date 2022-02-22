// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IAssetListingController.sol";

interface IMetahub is IAssetListingController {
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
     * @dev Emitted when the asset class controller is changed.
     * @param assetClass Asset class ID.
     * @param previousController Previous controller address.
     * @param newController New controller address.
     */
    event AssetClassControllerChanged(
        bytes4 indexed assetClass,
        address indexed previousController,
        address indexed newController
    );

    /**
     * @dev Emitted when the asset class vault is changed.
     * @param assetClass Asset class ID.
     * @param previousVault Previous vault address.
     * @param newVault New vault address.
     */
    event AssetClassVaultChanged(bytes4 indexed assetClass, address indexed previousVault, address indexed newVault);

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
     * @param presetData Warper additional initialization data.
     * @return Warper address.
     */
    function deployWarperWithData(
        uint256 universeId,
        address original,
        bytes32 presetId,
        bytes calldata presetData
    ) external returns (address);

    /**
     * @dev Sets asset class vault.
     * @param assetClass Asset class ID.
     * @param vault Asset class vault address.
     */
    function setAssetClassVault(bytes4 assetClass, address vault) external;

    /**
     * @dev Sets asset class controller.
     * @param assetClass Asset class ID.
     * @param controller Asset class controller address.
     */
    function setAssetClassController(bytes4 assetClass, address controller) external;

    /**
     * @dev Removes controller, associated with the provided asset class.
     * WARNING: This is destructive operation, which will lead to inability to process asset class, associated with the controller.
     * @param assetClass Asset class ID.
     */
    function removeAssetClassController(bytes4 assetClass) external;

    /**
     * @dev Returns asset class controller address.
     * @return Contract address.
     */
    function assetClassController(bytes4 assetClass) external view returns (address);

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

    /**
     * @dev Checks whether `account` is the `warper` admin.
     * @param warper Warper address.
     * @param account Account address.
     * @return True if the `account` is the admin of the `warper` and false otherwise.
     */
    function isWarperAdmin(address warper, address account) external view returns (bool);
}
