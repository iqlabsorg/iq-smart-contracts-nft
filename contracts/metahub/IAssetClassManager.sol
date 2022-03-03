// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../asset/IAssetController.sol";
import "../asset/IAssetVault.sol";

//todo: event AssetClassRegistered
interface IAssetClassManager {
    /**
     * @dev Asset class configuration.
     * @param controller Asset class controller.
     * @param vault Asset class vault.
     */
    struct AssetClassConfig {
        IAssetController controller;
        IAssetVault vault;
    }

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
     * @dev Registers new asset class.
     * @param assetClass Asset class ID.
     * @param config Asset class initial configuration.
     */
    function registerAssetClass(bytes4 assetClass, AssetClassConfig calldata config) external;

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
     */
    function assetClassConfig(bytes4 assetClass) external view returns (AssetClassConfig memory);
}
