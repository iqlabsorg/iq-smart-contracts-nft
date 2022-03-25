// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "../asset/Assets.sol";
import "./IListingController.sol";

library Listings {
    using ERC165CheckerUpgradeable for address;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using Listings for Registry;
    using Listings for Listing;

    /*
     * @dev Listing strategy identifiers to be used across the system:
     */
    bytes4 public constant FIXED_PRICE = bytes4(keccak256("FIXED_PRICE"));

    /**
     * @dev Thrown when the `listingId` is invalid or the asset has been delisted.
     */
    error NotListed(uint256 listingId);

    /**
     * @dev Thrown when the operation is not allowed due to the listing being paused.
     */
    error ListingIsPaused();

    /**
     * @dev Thrown when the operation is not allowed due to the listing not being paused.
     */
    error ListingIsNotPaused();

    /**
     * @dev Thrown when attempting to lock the listed asset for the period longer than the lister allowed.
     */
    error MaxLockPeriodExceeded();

    /**
     * @dev Thrown when listing controller is dos not implement the required interface.
     */
    error InvalidListingControllerInterface();

    /**
     * @dev Thrown upon attempting to register a listing strategy twice.
     * @param strategyId Duplicate listing strategy ID.
     */
    error ListingStrategyIsAlreadyRegistered(bytes4 strategyId);

    /**
     * @dev Thrown when the listing strategy is not registered or deprecated.
     * @param strategyId Unsupported listing strategy ID.
     */
    error UnsupportedListingStrategy(bytes4 strategyId);

    /**
     * @dev Throws if provided address is not a valid listing controller.
     * @param controller Listing controller address.
     */
    function checkValidListingController(address controller) internal view {
        if (!controller.supportsInterface(type(IListingController).interfaceId))
            revert InvalidListingControllerInterface();
    }

    /**
     * @dev Listing params.
     * The layout of `data` might vary for different listing strategies.
     * For example, in case of FIXED_PRICE strategy, the `data` might contain only base rate,
     * and for more advanced auction strategies it might include period, min bid step etc.
     * @param strategy Listing strategy ID
     * @param data Listing strategy data.
     */
    struct Params {
        bytes4 strategy;
        bytes data;
    }

    /**
     * @dev Listing structure.
     * @param lister Lister account address.
     * @param asset Listed asset structure.
     * @param params Listing strategy parameters.
     * @param maxLockPeriod The maximum amount of time the asset owner can wait before getting the asset back.
     * @param lockedTill The earliest possible time when the asset can be returned to the owner.
     * @param delisted Indicates whether the asset is delisted.
     * @param paused Indicates whether the listing is paused.
     */
    struct Listing {
        address lister; // todo: move after params
        Assets.Asset asset;
        Params params;
        uint32 maxLockPeriod;
        uint32 lockedTill;
        bool delisted;
        bool paused;
    }

    /**
     * @dev Puts the listing on pause.
     */
    function pause(Listing storage self) internal {
        if (self.paused) revert ListingIsPaused();

        self.paused = true;
    }

    /**
     * @dev Lifts the listing pause.
     */
    function unpause(Listing storage self) internal {
        if (!self.paused) revert ListingIsNotPaused();

        self.paused = false;
    }

    /**
     * Determines whether the listing is active.
     */
    function listed(Listing storage self) internal view returns (bool) {
        return self.lister != address(0) && !self.delisted;
    }

    /**
     * @dev Extends listing lock time.
     * Does not modify the state if current lock time is larger.
     */
    function addLock(Listing storage self, uint32 unlockTimestamp) internal {
        // Listing is already locked till later time, no need to extend locking period.
        if (self.lockedTill >= unlockTimestamp) return;
        // Try to extend listing lock.
        uint32 lockPeriod = unlockTimestamp - uint32(block.timestamp);
        if (lockPeriod > self.maxLockPeriod) revert MaxLockPeriodExceeded();
        self.lockedTill = unlockTimestamp;
    }

    /**
     * @dev Listing related data associated with the specific account.
     * @param listingIndex The set of listing IDs.
     */
    struct Lister {
        EnumerableSetUpgradeable.UintSet listingIndex;
    }

    /**
     * @dev Listing strategy information.
     * @param controller Listing controller address.
     */
    struct Strategy {
        IListingController controller;
    }

    /**
     * @dev Listing registry.
     * @param idTracker Listing ID tracker (incremental counter).
     * @param listings Mapping from listing ID to the listing info.
     * @param listers Mapping from lister address to the lister info.
     * @param strategies Mapping from listing strategy ID to the listing strategy configuration.
     */
    struct Registry {
        CountersUpgradeable.Counter idTracker; // todo: reduce size
        mapping(uint256 => Listing) listings;
        mapping(address => Lister) listers;
        mapping(bytes4 => Strategy) strategies;
    }

    /**
     * @dev Registers new listing.
     * @return listingId New listing ID.
     */
    function add(Registry storage self, Listing memory listing) internal returns (uint256 listingId) {
        // Generate new listing ID.
        self.idTracker.increment();
        listingId = self.idTracker.current();
        // Store new listing record.
        self.listings[listingId] = listing;
        // Add user listing data.
        self.listers[listing.lister].listingIndex.add(listingId);
    }

    /**
     * @dev Removes listing data.
     * @param listingId The ID of the listing to be deleted.
     */
    function remove(Registry storage self, uint256 listingId) internal {
        address lister = self.listings[listingId].lister;
        // Remove user listing data.
        self.listers[lister].listingIndex.remove(listingId);
        // Delete listing.
        delete self.listings[listingId];
    }

    /**
     * @dev Adds new listing strategy to the registry.
     */
    function registerStrategy(
        Registry storage self,
        bytes4 strategyId,
        Strategy calldata config
    ) internal {
        checkValidListingController(address(config.controller));
        if (self.isRegisteredListingStrategy(strategyId)) revert ListingStrategyIsAlreadyRegistered(strategyId);
        self.strategies[strategyId] = config;
    }

    /**
     * @dev Stores new controller address for the listing strategy.
     */
    function setListingStrategyController(
        Registry storage self,
        bytes4 strategyId,
        address controller
    ) internal {
        checkValidListingController(controller);
        self.strategies[strategyId].controller = IListingController(controller);
    }

    /**
     * @dev Checks listing registration by ID.
     * @param listingId Listing ID.
     */
    function isRegisteredListing(Registry storage self, uint256 listingId) internal view returns (bool) {
        return self.listings[listingId].lister != address(0);
    }

    /**
     * @dev Checks listing strategy registration by ID.
     * @param strategyId Listing strategy ID.
     */
    function isRegisteredListingStrategy(Registry storage self, bytes4 strategyId) internal view returns (bool) {
        return address(self.strategies[strategyId].controller) != address(0);
    }

    /**
     * @dev Throws if listing strategy is not supported.
     * @param strategyId Listing strategy ID.
     */
    function checkListingStrategySupport(Registry storage self, bytes4 strategyId) internal view {
        if (!self.isRegisteredListingStrategy(strategyId)) revert UnsupportedListingStrategy(strategyId);
    }

    /**
     * @dev Throws if listing is not registered or has been already delisted.
     * @param listingId Listing ID.
     */
    function checkListed(Registry storage self, uint256 listingId) internal view {
        if (!self.listings[listingId].listed()) revert NotListed(listingId);
    }
}
