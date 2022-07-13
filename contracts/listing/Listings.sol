// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../asset/Assets.sol";
import "./IListingController.sol";
import "./IListingStrategyRegistry.sol";

library Listings {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using Listings for Registry;
    using Listings for Listing;
    using Assets for Assets.Asset;

    /**
     * @dev Thrown when the `listingId` is invalid or the asset has been delisted.
     */
    error NotListed(uint256 listingId);

    /**
     * @dev Thrown when the `listingId` has never been registered.
     */
    error ListingIsNotRegistered(uint256 listingId);

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
    error InvalidLockPeriod(uint32 period);

    /**
     * @dev Thrown when the listing strategy is not registered or deprecated.
     * @param strategyId Unsupported listing strategy ID.
     */
    error UnsupportedListingStrategy(bytes4 strategyId);

    /**
     * @dev Thrown when the operation is not allowed due to the listing group being nonempty.
     * @param listingGroupId Listing group ID.
     */
    error ListingGroupIsNotEmpty(uint256 listingGroupId);

    /**
     * @dev Thrown when the provided `account` doesn't match the listing group owner address.
     * @param listingGroupId Listing group ID.
     * @param account Invalid owner account.
     */
    error InvalidListingGroupOwner(uint256 listingGroupId, address account);

    /*
     * @dev Listing strategy identifiers to be used across the system:
     */
    bytes4 public constant FIXED_PRICE = bytes4(keccak256("FIXED_PRICE"));

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
     * @param asset Listed asset structure.
     * @param params Listing strategy parameters.
     * @param lister Lister account address.
     * @param maxLockPeriod The maximum amount of time the asset owner can wait before getting the asset back.
     * @param lockedTill The earliest possible time when the asset can be returned to the owner.
     * @param immediatePayout Indicates whether the rental fee must be transferred to the lister on every renting.
     * If FALSE, the rental fees get accumulated until withdrawn manually.
     * @param delisted Indicates whether the asset is delisted.
     * @param paused Indicates whether the listing is paused.
     * @param groupId Listing group ID.
     */
    struct Listing {
        // slots 0-2
        Assets.Asset asset;
        // slot 3-4
        Params params;
        // slot 5 (1 byte)
        address lister;
        uint32 maxLockPeriod;
        uint32 lockedTill;
        bool immediatePayout;
        bool delisted;
        bool paused;
        // slot 6
        uint256 groupId;
    }

    /**
     * @dev Listing related data associated with the specific account.
     * @param listingIndex The set of listing IDs.
     * @param listingGroupIndex The set of listing group IDs.
     */
    struct ListerInfo {
        EnumerableSetUpgradeable.UintSet listingIndex;
        EnumerableSetUpgradeable.UintSet listingGroupIndex;
    }

    /**
     * @dev Listing related data associated with the specific account.
     * @param listingIndex The set of listing IDs.
     */
    struct AssetInfo {
        EnumerableSetUpgradeable.UintSet listingIndex;
    }

    /**
     * @dev Listing group information.
     * @param name The listing group name.
     * @param owner The listing group owner address.
     * @param listingIndex The set of listing IDs which belong to the group.
     */
    struct ListingGroupInfo {
        string name;
        address owner;
        EnumerableSetUpgradeable.UintSet listingIndex;
    }

    /**
     * @dev Listing registry.
     * @param idTracker Listing ID tracker (incremental counter).
     * @param strategyRegistry Listing strategy registry contract.
     * @param listingIndex The global set of registered listing IDs.
     * @param listings Mapping from listing ID to the listing info.
     * @param listers Mapping from lister address to the lister info.
     * @param assets Mapping from an asset address to the asset info.
     * @param listingGroups Mapping from listing group ID to the listing group info.
     */
    struct Registry {
        CountersUpgradeable.Counter listingIdTracker;
        IListingStrategyRegistry strategyRegistry;
        EnumerableSetUpgradeable.UintSet listingIndex;
        mapping(uint256 => Listing) listings;
        mapping(address => ListerInfo) listers;
        mapping(address => AssetInfo) assets;
        CountersUpgradeable.Counter listingGroupIdTracker;
        mapping(uint256 => ListingGroupInfo) listingGroups;
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
     * @dev Reverts if the listing is paused.
     */
    function checkNotPaused(Listing storage self) internal view {
        if (self.paused) revert ListingIsPaused();
    }

    /*
     * @dev Validates lock period.
     */
    function isValidLockPeriod(Listing storage self, uint32 lockPeriod) internal view returns (bool) {
        return (lockPeriod > 0 && lockPeriod <= self.maxLockPeriod);
    }

    /**
     * @dev Reverts if the lock period is not valid.
     */
    function checkValidLockPeriod(Listing storage self, uint32 lockPeriod) internal view {
        if (!self.isValidLockPeriod(lockPeriod)) revert InvalidLockPeriod(lockPeriod);
    }

    /**
     * @dev Extends listing lock time.
     * Does not modify the state if current lock time is larger.
     */
    function addLock(Listing storage self, uint32 unlockTimestamp) internal {
        // Listing is already locked till later time, no need to extend locking period.
        if (self.lockedTill >= unlockTimestamp) return;
        // Extend listing lock.
        self.lockedTill = unlockTimestamp;
    }

    /**
     * @dev Registers new listing group.
     * @param name The listing group name.
     * @param owner The listing group owner address.
     * @return listingGroupId New listing group ID.
     */
    function registerListingGroup(
        Registry storage self,
        string memory name,
        address owner
    ) external returns (uint256 listingGroupId) {
        listingGroupId = _registerListingGroup(self, name, owner);
    }

    /**
     * @dev Removes listing group data.
     * @param listingGroupId The ID of the listing group to be deleted.
     */
    function removeListingGroup(Registry storage self, uint256 listingGroupId) external {
        ListingGroupInfo storage listingGroup = self.listingGroups[listingGroupId];

        // Deleting nonempty listing groups is forbidden.
        if (listingGroup.listingIndex.length() > 0) revert ListingGroupIsNotEmpty(listingGroupId);

        // Remove the listing group ID from the user account data.
        self.listers[listingGroup.owner].listingGroupIndex.remove(listingGroupId);

        // Delete listing group.
        delete self.listingGroups[listingGroupId];
    }

    /**
     * @dev Registers new listing.
     * @return listingId New listing ID.
     * @return listingGroupId Effective listing group ID.
     */
    function register(Registry storage self, Listing memory listing)
        external
        returns (uint256 listingId, uint256 listingGroupId)
    {
        // Generate new listing ID.
        self.listingIdTracker.increment();
        listingId = self.listingIdTracker.current();

        // Listing is being added to an existing group.
        if (listing.groupId != 0) {
            listingGroupId = listing.groupId;
            self.checkListingGroupOwner(listingGroupId, listing.lister);
        } else {
            // Otherwise the new listing group is created and the listing is added to this group by default.
            listingGroupId = _registerListingGroup(self, "", listing.lister);
            listing.groupId = listingGroupId;
        }

        // Add new listing ID to the global index.
        self.listingIndex.add(listingId);
        // Add new listing ID to the listing group index.
        self.listingGroups[listingGroupId].listingIndex.add(listingId);
        // Add user listing data.
        self.listers[listing.lister].listingIndex.add(listingId);
        // Add asset listing data.
        self.assets[listing.asset.token()].listingIndex.add(listingId);
        // Store new listing record.
        self.listings[listingId] = listing;
    }

    /**
     * @dev Removes listing data.
     * @param listingId The ID of the listing to be deleted.
     */
    function remove(Registry storage self, uint256 listingId) external {
        address lister = self.listings[listingId].lister;
        address original = self.listings[listingId].asset.token();
        uint256 listingGroupId = self.listings[listingId].groupId;

        // Remove the listing ID from the global index.
        self.listingIndex.remove(listingId);
        // Remove the listing ID from the group index.
        self.listingGroups[listingGroupId].listingIndex.remove(listingId);
        // Remove user listing data.
        self.listers[lister].listingIndex.remove(listingId);
        // Remove asset listing data.
        self.assets[original].listingIndex.remove(listingId);
        // Delete listing.
        delete self.listings[listingId];
    }

    /**
     * @dev Returns the paginated list of currently registered listings.
     */
    function allListings(
        Registry storage self,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory, Listing[] memory) {
        return self.paginateIndexedListings(self.listingIndex, offset, limit);
    }

    /**
     * @dev Returns the paginated list of currently registered listings for the particular lister account.
     */
    function userListings(
        Registry storage self,
        address lister,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory, Listing[] memory) {
        return self.paginateIndexedListings(self.listers[lister].listingIndex, offset, limit);
    }

    /**
     * @dev Returns the paginated list of currently registered listings for the original asset.
     */
    function assetListings(
        Registry storage self,
        address original,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory, Listing[] memory) {
        return self.paginateIndexedListings(self.assets[original].listingIndex, offset, limit);
    }

    /**
     * @dev Reverts if listing has not been registered.
     * @param listingId Listing ID.
     */
    function checkRegisteredListing(Registry storage self, uint256 listingId) external view {
        if (!self.isRegisteredListing(listingId)) revert ListingIsNotRegistered(listingId);
    }

    /**
     * @dev Reverts if the provided `account` doesn't match the listing group owner address.
     * @param listingGroupId Listing group ID.
     * @param account The account to check ownership for.
     */
    function checkListingGroupOwner(
        Registry storage self,
        uint256 listingGroupId,
        address account
    ) internal view {
        if (self.listingGroups[listingGroupId].owner != account)
            revert InvalidListingGroupOwner(listingGroupId, account);
    }

    /**
     * @dev Checks listing registration by ID.
     * @param listingId Listing ID.
     */
    function isRegisteredListing(Registry storage self, uint256 listingId) internal view returns (bool) {
        return self.listings[listingId].lister != address(0);
    }

    /**
     * @dev Reverts if listing strategy is not supported.
     * @param strategyId Listing strategy ID.
     */
    function checkSupportedListingStrategy(Registry storage self, bytes4 strategyId) internal view {
        if (!self.strategyRegistry.isRegisteredListingStrategy(strategyId))
            revert UnsupportedListingStrategy(strategyId);
    }

    /**
     * @dev Returns listing controller for strategy.
     * @param strategyId Listing strategy ID.
     */
    function listingController(Registry storage self, bytes4 strategyId) internal view returns (IListingController) {
        return IListingController(self.strategyRegistry.listingController(strategyId));
    }

    /**
     * @dev Reverts if listing is not registered or has been already delisted.
     * @param listingId Listing ID.
     */
    function checkListed(Registry storage self, uint256 listingId) internal view {
        if (!self.listings[listingId].listed()) revert NotListed(listingId);
    }

    /**
     * @dev Returns the number of currently registered listings.
     */
    function listingCount(Registry storage self) internal view returns (uint256) {
        return self.listingIndex.length();
    }

    /**
     * @dev Returns the number of currently registered listings for a particular lister account.
     */
    function userListingCount(Registry storage self, address lister) internal view returns (uint256) {
        return self.listers[lister].listingIndex.length();
    }

    /**
     * @dev Returns the number of currently registered listings for a particular original asset.
     */
    function assetListingCount(Registry storage self, address original) internal view returns (uint256) {
        return self.assets[original].listingIndex.length();
    }

    /**
     * @dev Returns the paginated list of currently registered listing using provided index reference.
     */
    function paginateIndexedListings(
        Registry storage self,
        EnumerableSetUpgradeable.UintSet storage listingIndex,
        uint256 offset,
        uint256 limit
    ) internal view returns (uint256[] memory, Listing[] memory) {
        uint256 indexSize = listingIndex.length();
        if (offset >= indexSize) return (new uint256[](0), new Listing[](0));

        if (limit > indexSize - offset) {
            limit = indexSize - offset;
        }

        Listing[] memory listings = new Listing[](limit);
        uint256[] memory listingIds = new uint256[](limit);
        for (uint256 i = 0; i < limit; i++) {
            listingIds[i] = listingIndex.at(offset + i);
            listings[i] = self.listings[listingIds[i]];
        }

        return (listingIds, listings);
    }

    /**
     * @dev Registers new listing group.
     * @param name The listing group name.
     * @param owner The listing group owner address.
     * @return listingGroupId New listing group ID.
     */
    function _registerListingGroup(
        Registry storage self,
        string memory name,
        address owner
    ) private returns (uint256 listingGroupId) {
        // Generate new listing group ID.
        self.listingGroupIdTracker.increment();
        listingGroupId = self.listingGroupIdTracker.current();

        // Store new listing group record.
        self.listingGroups[listingGroupId].name = name;
        self.listingGroups[listingGroupId].owner = owner;

        // Associate the new listing group with the user account.
        self.listers[owner].listingGroupIndex.add(listingGroupId);
    }
}
