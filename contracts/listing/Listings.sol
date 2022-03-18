// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "../asset/Assets.sol";

library Listings {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    /*
     * @dev Listing strategy identifiers to be used across the system:
     */
    bytes4 public constant FIXED_PRICE = bytes4(keccak256("FIXED_PRICE"));

    /**
     * @dev Thrown when the operation is not allowed due to the listing being paused.
     */
    error ListingIsPaused();

    /**
     * @dev Thrown when the operation is not allowed due to the listing not being paused.
     */
    error ListingIsNotPaused();

    //todo: docs
    error MaxLockPeriodExceeded();

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
     * @dev Listing info structure.
     * @param lister Lister account address.
     * @param asset Listed asset structure.
     * @param params Listing strategy parameters.
     * @param maxLockPeriod The maximum amount of time the asset owner can wait before getting the asset back.
     * @param lockedTill The earliest possible time when the asset can be returned to the owner.
     * @param delisted Indicates whether the asset is delisted.
     * @param paused Indicates whether the listing is paused.
     */
    struct Info {
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
    function pause(Info storage self) internal {
        if (self.paused) revert ListingIsPaused();

        self.paused = true;
    }

    /**
     * @dev Lifts the listing pause.
     */
    function unpause(Info storage self) internal {
        if (!self.paused) revert ListingIsNotPaused();

        self.paused = false;
    }

    /**
     * Determines whether the listing is active.
     */
    function listed(Info storage self) internal view returns (bool) {
        return self.lister != address(0) && !self.delisted;
    }

    /**
     * @dev Extends listing lock time.
     * Does not modify the state if current lock time is larger.
     */
    function addLock(Info storage self, uint32 unlockTimestamp) internal {
        // Listing is already locked till later time, no need to extend locking period.
        if (self.lockedTill >= unlockTimestamp) return;
        // Try to extend listing lock.
        uint32 lockPeriod = unlockTimestamp - uint32(block.timestamp);
        if (lockPeriod > self.maxLockPeriod) revert MaxLockPeriodExceeded();
        self.lockedTill = unlockTimestamp;
    }

    /**
     * @dev Listing registry.
     * @param idTracker Listing ID tracker (incremental counter).
     * @param listings Mapping from listing ID to the listing info.
     */
    struct Registry {
        CountersUpgradeable.Counter idTracker; // todo: reduce size
        mapping(uint256 => Info) listings;
    }

    /**
     * @dev Saves new listing information under new ID.
     * @return listingId New listing ID.
     */
    function register(Registry storage self, Info memory listing) internal returns (uint256 listingId) {
        // Generate new listing ID.
        self.idTracker.increment();
        listingId = self.idTracker.current();
        // Store new listing record.
        self.listings[listingId] = listing;
    }
}
