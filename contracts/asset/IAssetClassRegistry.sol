// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IAssetController.sol";
import "./IAssetVault.sol";

interface IAssetClassRegistry {
    /**
     * @dev Thrown when the asset class supported by contract does not match the required one.
     * @param provided Provided class ID.
     * @param required Required class ID.
     */
    error AssetClassMismatch(bytes4 provided, bytes4 required);

    /**
     * @dev Thrown upon attempting to register an asset class twice.
     * @param assetClass Duplicate asset class ID.
     */
    error AssetClassIsAlreadyRegistered(bytes4 assetClass);

    /**
     * @dev Thrown upon attempting to work with unregistered asset class.
     * @param assetClass Asset class ID.
     */
    error UnregisteredAssetClass(bytes4 assetClass);

    /**
     * @dev Thrown when the asset controller contract does not implement the required interface.
     */
    error InvalidAssetControllerInterface();

    /**
     * @dev Thrown when the vault contract does not implement the required interface.
     */
    error InvalidAssetVaultInterface();

    /**
     * @dev Emitted when the new asset class is registered.
     * @param assetClass Asset class ID.
     * @param controller Controller address.
     * @param vault Vault address.
     */
    event AssetClassRegistered(bytes4 indexed assetClass, address indexed controller, address indexed vault);

    /**
     * @dev Emitted when the asset class controller is changed.
     * @param assetClass Asset class ID.
     * @param newController New controller address.
     */
    event AssetClassControllerChanged(bytes4 indexed assetClass, address indexed newController);

    /**
     * @dev Emitted when the asset class vault is changed.
     * @param assetClass Asset class ID.
     * @param newVault New vault address.
     */
    event AssetClassVaultChanged(bytes4 indexed assetClass, address indexed newVault);

    /**
     * @dev Asset class configuration.
     * @param vault Asset class vault.
     * @param controller Asset class controller.
     */
    struct ClassConfig {
        address vault;
        address controller;
    }

    /**
     * @dev Registers new asset class.
     * @param assetClass Asset class ID.
     * @param config Asset class initial configuration.
     */
    function registerAssetClass(bytes4 assetClass, ClassConfig calldata config) external;

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
     * @dev Returns asset class configuration.
     * @param assetClass Asset class ID.
     * @return Asset class configuration.
     */
    function assetClassConfig(bytes4 assetClass) external view returns (ClassConfig memory);

    /**
     * @dev Checks asset class registration.
     * @param assetClass Asset class ID.
     */
    function isRegisteredAssetClass(bytes4 assetClass) external view returns (bool);

    /**
     * @dev Reverts if asset class is not registered.
     * @param assetClass Asset class ID.
     */
    function checkRegisteredAssetClass(bytes4 assetClass) external view;
}
