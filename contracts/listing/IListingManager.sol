// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../asset/Assets.sol";
import "../asset/IAssetController.sol";
import "../listing/IListingController.sol";
import "./Listings.sol";

interface IListingManager {
    /**
     * @dev Thrown when the `listingId` is invalid or the asset has been delisted.
     */
    error NotListed(uint256 listingId);

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
     * @dev Thrown when there are no registered warpers for a particular asset.
     * @param asset Asset address.
     */
    error UnsupportedAsset(address asset);

    /**
     * @dev Thrown upon attempting to register a listing strategy twice.
     * @param strategyId Duplicate listing strategy ID.
     */
    error ListingStrategyIsAlreadyRegistered(bytes4 strategyId);

    /**
     * @dev Thrown when listing controller is dos not implement the required interface.
     */
    error InvalidListingControllerInterface();

    /**
     * @dev Thrown when the listing strategy is not registered or deprecated.
     * @param strategyId Unsupported listing strategy ID.
     */
    error UnsupportedListingStrategy(bytes4 strategyId);

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
     * @dev Listing strategy configuration.
     * @param controller Listing controller address.
     */
    struct ListingStrategyConfig {
        IListingController controller;
    }

    /**
     * @dev Registers new listing strategy.
     * @param strategyId Listing strategy ID.
     * @param config Listing strategy configuration.
     */
    function registerListingStrategy(bytes4 strategyId, ListingStrategyConfig calldata config) external;

    /**
     * @dev Sets listing strategy controller.
     * @param strategyId Listing strategy ID.
     * @param controller Listing controller address.
     */
    function setListingController(bytes4 strategyId, address controller) external;

    /**
     * @dev Returns listing strategy configuration.
     * @param strategyId Listing strategy ID.
     * @return Listing strategy config.
     */
    function listingStrategy(bytes4 strategyId) external view returns (ListingStrategyConfig memory);

    /**
     * @dev Performs new asset listing.
     * Emits an {AssetListed} event.
     * @param asset Asset to be listed.
     * @param params Listing strategy parameters.
     * @param maxLockPeriod The maximum amount of time the original asset owner can wait before getting the asset back.
     * @return New listing ID.
     */
    function listAsset(
        Assets.Asset calldata asset,
        Listings.Params calldata params,
        uint32 maxLockPeriod
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
    function listingInfo(uint256 listingId) external view returns (Listings.Info memory);
}
