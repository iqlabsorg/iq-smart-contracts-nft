// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../warper/IWarperManager.sol";
import "../warper/IWarperController.sol";

interface IAssetManager {
    /**
     * @dev Register a new asset.
     * @param assetClass Asset class identifier.
     * @param original The original assets address.
     */
    function registerAsset(bytes4 assetClass, address original) external;

    /**
     * @dev Retrieve the asset class controller for a given assetClass.
     * @param assetClass Asset class identifier.
     * @return The asset class controller.
     */
    function assetClassController(bytes4 assetClass) external view returns (address);

    /**
     * @dev Check if the given account is the admin of a warper.
     * @param warper Address of the warper.
     * @param account The users account to checked for the admin permissions on the warper.
     * @return True if the account is the admin of the warper.
     */
    function isWarperAdmin(address warper, address account) external view returns (bool);

    /**
     * @dev Returns the number of currently supported assets.
     * @return Asset count.
     */
    function supportedAssetCount() external view returns (uint256);

    /**
     * @dev Returns the list of all supported asset addresses.
     * @param offset Starting index.
     * @param limit Max number of items.
     * @return List of original asset addresses.
     * @return List of asset config structures.
     */
    function supportedAssets(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory, Assets.AssetConfig[] memory);
}
