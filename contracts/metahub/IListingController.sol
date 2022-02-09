// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IListingController {
    /**
     * @dev Emitted when a new asset is listed for renting.
     * @param asset Listed asset address.
     * @param assetId Listed asset ID.
     */
    event AssetListed(address indexed asset, uint256 assetId);

    /**
     * @dev Listing request parameters
     * @param asset Asset address.
     * @param assetId Asset ID.
     * @param maxLockPeriod The maximum amount of time the original asset owner can wait before getting the asset back.
     */
    struct ListingParams {
        address asset;
        uint256 assetId;
        uint32 maxLockPeriod;
        uint32 baseRate;
    }

    /**
     * @dev Performs asset listing procedure.
     * @param params Listing params.
     */
    function listAsset(ListingParams calldata params) external;
}
