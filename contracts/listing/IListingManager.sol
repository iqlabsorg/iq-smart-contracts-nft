// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../asset/Assets.sol";
import "../asset/IAssetController.sol";
import "../listing/IListingController.sol";
import "./Listings.sol";

interface IListingManager {
    /**
     * @dev Thrown when the message sender doesn't match the asset lister address.
     */
    error CallerIsNotAssetLister();

    /**
     * @dev Thrown when the original asset cannot be withdrawn because of active rentals
     * or other activity that requires asset to stay in the vault.
     */
    error AssetIsLocked();

    /**
     * @dev Emitted when a new asset is listed for renting.
     * @param listingId Listing ID.
     * @param lister Lister account address.
     * @param asset Listing asset.
     * @param params Listing strategy parameters.
     * @param maxLockPeriod The maximum amount of time the original asset owner can wait before getting the asset back.
     */
    event AssetListed(
        uint256 indexed listingId,
        address indexed lister,
        Assets.Asset asset,
        Listings.Params params,
        uint32 maxLockPeriod
    );

    /**
     * @dev Emitted when the asset is no longer available for renting.
     * @param listingId Listing ID.
     * @param lister Lister account address.
     * @param unlocksAt The earliest possible time when the asset can be returned to the owner.
     */
    event AssetDelisted(uint256 indexed listingId, address indexed lister, uint32 unlocksAt);

    /**
     * @dev Emitted when the asset is returned to the `lister`.
     * @param listingId Listing ID.
     * @param lister Lister account address.
     * @param asset Returned asset.
     */
    event AssetWithdrawn(uint256 indexed listingId, address indexed lister, Assets.Asset asset);

    /**
     * @dev Emitted when the listing is paused.
     * @param listingId Listing ID.
     */
    event ListingPaused(uint256 indexed listingId);

    /**
     * @dev Emitted when the listing pause is lifted.
     * @param listingId Listing ID.
     */
    event ListingUnpaused(uint256 indexed listingId);

    /**
     * @dev Performs new asset listing.
     * Emits an {AssetListed} event.
     * @param asset Asset to be listed.
     * @param params Listing strategy parameters.
     * @param maxLockPeriod The maximum amount of time the original asset owner can wait before getting the asset back.
     * @param immediatePayout Indicates whether the rental fee must be transferred to the lister on every renting.
     * If FALSE, the rental fees get accumulated until withdrawn manually.
     * @return New listing ID.
     */
    function listAsset(
        Assets.Asset calldata asset,
        Listings.Params calldata params,
        uint32 maxLockPeriod,
        bool immediatePayout
    ) external returns (uint256);

    /**
     * @dev Marks the asset as being delisted. This operation in irreversible.
     * After delisting, the asset can only be withdrawn when it has no active rentals.
     * Emits an {AssetDelisted} event.
     * @param listingId Listing ID.
     */
    function delistAsset(uint256 listingId) external;

    /**
     * @dev Returns the asset back to the lister.
     * Emits an {AssetWithdrawn} event.
     * @param listingId Listing ID.
     */
    function withdrawAsset(uint256 listingId) external;

    /**
     * @dev Puts the listing on pause.
     * Emits a {ListingPaused} event.
     * @param listingId Listing ID.
     */
    function pauseListing(uint256 listingId) external;

    /**
     * @dev Lifts the listing pause.
     * Emits a {ListingUnpaused} event.
     * @param listingId Listing ID.
     */
    function unpauseListing(uint256 listingId) external;

    /**
     * @dev Returns the listing details by the listing ID.
     * @param listingId Listing ID.
     * @return Listing details.
     */
    function listingInfo(uint256 listingId) external view returns (Listings.Listing memory);
}
