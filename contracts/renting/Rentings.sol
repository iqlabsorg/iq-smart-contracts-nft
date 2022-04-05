// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "../asset/Assets.sol";

library Rentings {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using Rentings for RenterInfo;
    using Rentings for Agreement;
    using Rentings for Registry;
    using Assets for Assets.AssetId;

    /**
     * @dev Defines the maximal allowed number of cycles when looking for expired rental agreements.
     */
    uint256 private constant GC_CYCLES = 20;

    /**
     * @dev Warper rental status.
     * NONE - means the warper had never been minted.
     * AVAILABLE - can be rented.
     * RENTED - currently rented.
     */
    enum RentalStatus {
        NONE,
        AVAILABLE,
        RENTED
    }

    /**
     * @dev Thrown when a rental agreement is being registered for a specific warper ID,
     * while the previous rental agreement for this warper is still effective.
     */
    error RentalAgreementConflict(uint256 conflictingRentalId);

    /**
     * @dev Thrown when attempting to delete effective rental agreement data (before expiration).
     */
    error CannotDeleteEffectiveRentalAgreement(uint256 rentalId);

    /**
     * @dev Rental fee breakdown.
     */
    struct RentalFees {
        uint256 total;
        uint256 protocolFee;
        uint256 listerBaseFee;
        uint256 listerPremium;
        uint256 universeBaseFee;
        uint256 universePremium;
    }

    /**
     * @dev Renting parameters structure. It is used to encode all the necessary information to estimate and/or fulfill a particular renting request.
     * @param listingId Listing ID. Also allows to identify the asset being rented.
     * @param warper Warper address.
     * @param renter Renter address.
     * @param rentalPeriod Desired period of asset renting.
     * @param paymentToken The token address which renter offers as a mean of payment.
     */
    struct Params {
        uint256 listingId;
        address warper;
        address renter;
        uint32 rentalPeriod;
        address paymentToken;
    }

    // todo: docs
    struct Agreement {
        Assets.Asset warpedAsset;
        bytes32 collectionId;
        uint256 listingId;
        address renter;
        uint32 startTime;
        uint32 endTime;
    }

    function isEffective(Agreement storage self) internal view returns (bool) {
        return self.endTime > uint32(block.timestamp);
    }

    function duration(Agreement memory self) internal pure returns (uint32) {
        return self.endTime - self.startTime;
    }

    /**
     * @dev Describes user specific renting information.
     * @param rentalIndex Renter's set of rental agreement IDs.
     * @param collectionRentalIndex Mapping from collection ID to the set of rental IDs.
     */
    struct RenterInfo {
        EnumerableSetUpgradeable.UintSet rentalIndex;
        mapping(bytes32 => EnumerableSetUpgradeable.UintSet) collectionRentalIndex;
    }

    /**
     * @dev Describes asset specific renting information.
     * @param latestRentalId Holds the most recent rental agreement ID.
     */
    struct AssetInfo {
        uint256 latestRentalId; // NOTE: This must never be deleted during cleanup.
    }

    /**
     * @dev Renting registry.
     * @param idTracker Rental agreement ID tracker (incremental counter).
     * @param agreements Mapping from rental ID to the rental agreement details.
     * @param renters Mapping from renter address to the user specific renting info.
     * @param assets Mapping from asset ID (byte32) to the asset specific renting info.
     */
    struct Registry {
        CountersUpgradeable.Counter idTracker;
        mapping(uint256 => Agreement) agreements;
        mapping(address => RenterInfo) renters;
        mapping(bytes32 => AssetInfo) assets;
    }

    /**
     * @dev Returns the number of currently registered rental agreements for particular renter account.
     */
    function userRentalCount(Registry storage self, address renter) internal view returns (uint256) {
        return self.renters[renter].rentalIndex.length();
    }

    /**
     * @dev Returns the paginated list of currently registered rental agreements for particular renter account.
     */
    function userRentalAgreements(
        Registry storage self,
        address renter,
        uint256 offset,
        uint256 limit
    ) internal view returns (uint256[] memory, Rentings.Agreement[] memory) {
        EnumerableSetUpgradeable.UintSet storage userRentalIndex = self.renters[renter].rentalIndex;
        uint256 rentalCount = userRentalIndex.length();
        if (limit > rentalCount - offset) {
            limit = rentalCount - offset;
        }

        Rentings.Agreement[] memory agreements = new Rentings.Agreement[](limit);
        uint256[] memory rentalIds = new uint256[](limit);
        for (uint256 i = 0; i < limit; i++) {
            rentalIds[i] = userRentalIndex.at(i);
            agreements[i] = self.agreements[rentalIds[i]];
        }

        return (rentalIds, agreements);
    }

    /**
     * @dev Finds expired user rental agreements associated with `collectionId` and deletes them.
     * Deletes only first N entries defined by `toBeRemoved` param.
     * The total number of cycles is capped by GC_CYCLES constant.
     */
    function deleteExpiredUserRentalAgreements(
        Registry storage self,
        address renter,
        bytes32 collectionId,
        uint256 toBeRemoved
    ) internal {
        EnumerableSetUpgradeable.UintSet storage rentalIndex = self.renters[renter].collectionRentalIndex[collectionId];
        uint256 rentalCount = rentalIndex.length();
        if (rentalCount == 0 || toBeRemoved == 0) return;

        uint256 maxCycles = rentalCount < GC_CYCLES ? rentalCount : GC_CYCLES;
        uint256 removed = 0;
        for (uint256 i = 0; i < maxCycles; i++) {
            uint256 rentalId = rentalIndex.at(i);
            if (!self.agreements[rentalId].isEffective()) {
                _removeRentalAgreement(self, rentalId);
                if (removed++ == toBeRemoved) return;
            }
        }
    }

    /**
     * @dev Performs new rental agreement registration.
     */
    function register(Registry storage self, Agreement memory agreement) internal returns (uint256 rentalId) {
        // Make sure the there is no active rentals for the warper ID.
        bytes32 assetId = agreement.warpedAsset.id.hash();
        uint256 latestRentalId = self.assets[assetId].latestRentalId;
        if (latestRentalId != 0 && self.agreements[latestRentalId].isEffective()) {
            revert RentalAgreementConflict(latestRentalId);
        }

        // Generate new rental ID.
        self.idTracker.increment();
        rentalId = self.idTracker.current();

        // Save new rental agreement.
        self.agreements[rentalId] = agreement;

        // Update warper latest rental ID.
        self.assets[assetId].latestRentalId = rentalId;

        // Update user rental data.
        self.renters[agreement.renter].rentalIndex.add(rentalId);
        self.renters[agreement.renter].collectionRentalIndex[agreement.collectionId].add(rentalId);
    }

    /**
     * @dev Safely removes expired rental data from the registry.
     */
    function removeExpiredRentalAgreement(Registry storage self, uint256 rentalId) internal {
        if (self.agreements[rentalId].isEffective()) revert CannotDeleteEffectiveRentalAgreement(rentalId);
        _removeRentalAgreement(self, rentalId);
    }

    /**
     * @dev Removes rental data from the registry.
     */
    function _removeRentalAgreement(Registry storage self, uint256 rentalId) private {
        address renter = self.agreements[rentalId].renter;
        bytes32 collectionId = self.agreements[rentalId].collectionId;

        // Remove user rental data.
        self.renters[renter].rentalIndex.remove(rentalId);
        self.renters[renter].collectionRentalIndex[collectionId].remove(rentalId);

        // Delete rental agreement.
        delete self.agreements[rentalId];
    }

    /**
     * @dev Finds all effective rental agreements from specific collection.
     * Returns the total value rented by `renter`.
     */
    function collectionRentedValue(
        Registry storage self,
        address renter,
        bytes32 collectionId
    ) internal view returns (uint256 value) {
        EnumerableSetUpgradeable.UintSet storage rentalIndex = self.renters[renter].collectionRentalIndex[collectionId];
        uint256 length = rentalIndex.length();
        for (uint256 i = 0; i < length; i++) {
            Agreement storage agreement = self.agreements[rentalIndex.at(i)];
            if (agreement.isEffective()) {
                value += agreement.warpedAsset.value;
            }
        }
    }

    /**
     * @dev Returns asset rental status based on latest rental agreement.
     */
    function assetRentalStatus(Registry storage self, Assets.AssetId memory assetId)
        internal
        view
        returns (RentalStatus)
    {
        uint256 latestRentalId = self.assets[assetId.hash()].latestRentalId;
        if (latestRentalId == 0) return RentalStatus.NONE;

        return self.agreements[latestRentalId].isEffective() ? RentalStatus.RENTED : RentalStatus.AVAILABLE;
    }
}
