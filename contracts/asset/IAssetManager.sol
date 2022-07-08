// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../warper/IWarperManager.sol";
import "../warper/IWarperController.sol";

interface IAssetManager {
    /**
     * TODO
     */
    function registerAsset(bytes4 assetClass, address original) external;

    /**
     * TODO
     */
    function assetClassController(bytes4 assetClass) external view returns (address);

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
