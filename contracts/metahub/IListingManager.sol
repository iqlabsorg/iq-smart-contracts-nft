// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../listing/ListingStrategy.sol";
import "../asset/Assets.sol";
import "../asset/IAssetController.sol";

interface IListingManager {
    /**
     * @dev Emitted when a new asset is listed for renting.
     * @param listingId Listing ID.
     * @param lister Lister account address.
     * @param asset Listing asset.
     * @param strategy Listing strategy parameters.
     * @param maxLockPeriod The maximum amount of time the original asset owner can wait before getting the asset back.
     */
    event AssetListed(
        uint256 indexed listingId,
        address indexed lister,
        Assets.Asset asset,
        ListingStrategy.Params strategy,
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
     * @dev Listing request parameters.
     * @param asset Asset to be listed.
     * @param strategy Listing strategy parameters.
     * @param maxLockPeriod The maximum amount of time the original asset owner can wait before getting the asset back.
     */
    struct ListingParams {
        Assets.Asset asset;
        ListingStrategy.Params strategy;
        uint32 maxLockPeriod;
    }

    /**
     * @dev Listing details structure.
     * @param lister Lister account address.
     * @param token Listed asset contract address.
     * @param asset Listed asset structure.
     * @param strategy Listing strategy parameters.
     * @param maxLockPeriod The maximum amount of time the asset owner can wait before getting the asset back.
     * @param lockedTill The earliest possible time when the asset can be returned to the owner.
     * @param delisted Indicates whether the asset is delisted.
     * @param paused Indicates whether the listing is paused.
     */
    struct Listing {
        address lister;
        address token;
        Assets.Asset asset;
        ListingStrategy.Params strategy;
        uint32 maxLockPeriod;
        uint32 lockedTill;
        bool delisted; // todo: restricts new rentals
        bool paused; // todo: restricts new rentals
    }

    /**
     * @dev Listing strategy configuration.
     * @param controller Listing controller address.
     */
    struct ListingStrategyConfig {
        address controller;
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
     * @param params Listing params.
     * @return New listing ID.
     */
    function listAsset(ListingParams calldata params) external returns (uint256);

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
     * @return Listing structure.
     */
    function listing(uint256 listingId) external view returns (Listing memory);
}
