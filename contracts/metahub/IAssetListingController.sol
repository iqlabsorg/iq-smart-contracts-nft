// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../asset/Assets.sol";

interface IAssetListingController {
    /**
     * @dev Emitted when a new asset is listed for renting.
     * @param asset Listed asset address.
     * @param assetId Listed asset ID.
     */
    event AssetListed(address indexed asset, uint256 assetId);

    /**
     * @dev Listing request parameters
     * @param asset Asset to be listed.
     * @param maxLockPeriod The maximum amount of time the original asset owner can wait before getting the asset back.
     * @param baseRate Asset renting base rate (base tokens per second).
     */
    struct ListingParams {
        Assets.Asset asset;
        uint32 maxLockPeriod;
        uint32 baseRate;
    }

    /**
     * @dev Performs asset listing procedure.
     * @param params Listing params.
     */
    function listAsset(ListingParams calldata params) external;
}
