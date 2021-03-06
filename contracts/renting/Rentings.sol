// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "../asset/Assets.sol";
import "../metahub/Protocol.sol";
import "../listing/Listings.sol";
import "../warper/Warpers.sol";
import "../universe/IUniverseRegistry.sol";

library Rentings {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using Rentings for RenterInfo;
    using Rentings for Agreement;
    using Rentings for Registry;
    using Assets for Assets.AssetId;
    using Protocol for Protocol.Config;
    using Listings for Listings.Registry;
    using Listings for Listings.Listing;
    using Warpers for Warpers.Registry;
    using Warpers for Warpers.Warper;

    /**
     * A constant that represents one hundred percent for calculation.
     * This defines a calculation precision for percentage values as two decimals.
     * For example: 1 is 0.01%, 100 is 1%, 10_000 is 100%.
     */
    uint16 public constant HUNDRED_PERCENT = 10_000;

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
     * @dev Defines the maximal allowed number of cycles when looking for expired rental agreements.
     */
    uint256 private constant _GC_CYCLES = 20;

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
     * @dev Renting parameters structure.
     * It is used to encode all the necessary information to estimate and/or fulfill a particular renting request.
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

    /**
     * @dev Rental agreement information.
     * @param warpedAsset Rented asset.
     * @param collectionId Warped collection ID.
     * @param listingId The corresponding ID of the original asset listing.
     * @param renter The renter account address.
     * @param startTime The rental agreement staring time. This is the timestamp after which the `renter`
     * considered to be an warped asset owner.
     * @param endTime The rental agreement ending time. After this timestamp, the rental agreement is terminated
     * and the `renter` is no longer the owner of the warped asset.
     * @param listingParams Selected listing parameters.
     */
    struct Agreement {
        // slots 0-2
        Assets.Asset warpedAsset;
        // slot 3
        bytes32 collectionId;
        // slot 4
        uint256 listingId;
        // slot 5 (4 bytes left)
        address renter;
        uint32 startTime;
        uint32 endTime;
        // slots 6-7
        Listings.Params listingParams;
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
    ) external view returns (uint256[] memory, Rentings.Agreement[] memory) {
        EnumerableSetUpgradeable.UintSet storage userRentalIndex = self.renters[renter].rentalIndex;
        uint256 indexSize = userRentalIndex.length();
        if (offset >= indexSize) return (new uint256[](0), new Rentings.Agreement[](0));

        if (limit > indexSize - offset) {
            limit = indexSize - offset;
        }

        Rentings.Agreement[] memory agreements = new Rentings.Agreement[](limit);
        uint256[] memory rentalIds = new uint256[](limit);
        for (uint256 i = 0; i < limit; i++) {
            rentalIds[i] = userRentalIndex.at(offset + i);
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
    ) external {
        EnumerableSetUpgradeable.UintSet storage rentalIndex = self.renters[renter].collectionRentalIndex[collectionId];
        uint256 rentalCount = rentalIndex.length();
        if (rentalCount == 0 || toBeRemoved == 0) return;

        uint256 maxCycles = rentalCount < _GC_CYCLES ? rentalCount : _GC_CYCLES;
        uint256 removed = 0;

        for (uint256 i = 0; i < maxCycles; i++) {
            uint256 rentalId = rentalIndex.at(i);

            if (!self.agreements[rentalId].isEffective()) {
                // Warning: we are iterating an array that we are also modifying!
                _removeRentalAgreement(self, rentalId);
                removed += 1;
                maxCycles -= 1; // This is so we account for reduced `rentalCount`.

                // Stop iterating if we have cleaned up enough desired items.
                if (removed == toBeRemoved) break;
            }
        }
    }

    /**
     * @dev Performs new rental agreement registration.
     */
    function register(Registry storage self, Agreement memory agreement) external returns (uint256 rentalId) {
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
    function removeExpiredRentalAgreement(Registry storage self, uint256 rentalId) external {
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
    ) external view returns (uint256 value) {
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
        external
        view
        returns (RentalStatus)
    {
        uint256 latestRentalId = self.assets[assetId.hash()].latestRentalId;
        if (latestRentalId == 0) return RentalStatus.NONE;

        return self.agreements[latestRentalId].isEffective() ? RentalStatus.RENTED : RentalStatus.AVAILABLE;
    }

    /**
     * @dev Main renting request validation function.
     */
    function validateRentingParams(
        Params calldata params,
        Protocol.Config storage protocolConfig,
        Listings.Registry storage listingRegistry,
        IWarperManager warperManager
    ) external view {
        // Validate from the protocol perspective.
        protocolConfig.checkBaseToken(params.paymentToken);

        // Validate from the listing perspective.
        listingRegistry.checkListed(params.listingId);
        Listings.Listing storage listing = listingRegistry.listings[params.listingId];
        listing.checkNotPaused();
        listing.checkValidLockPeriod(params.rentalPeriod);

        // Validate from the warper perspective.
        warperManager.checkRegisteredWarper(params.warper);
        Warpers.Warper memory warper = warperManager.warperInfo(params.warper);
        warper.checkCompatibleAsset(listing.asset);
        warper.checkNotPaused();
        warper.controller.validateRentingParams(listing.asset, params);
    }

    /**
     * @dev Performs rental fee calculation and returns the fee breakdown.
     */
    function calculateRentalFees(
        Params calldata rentingParams,
        Protocol.Config storage protocolConfig,
        Listings.Registry storage listingRegistry,
        IWarperManager warperManager,
        IUniverseRegistry universeRegistry
    ) external view returns (RentalFees memory fees) {
        // Calculate lister base fee.
        Listings.Listing storage listing = listingRegistry.listings[rentingParams.listingId];
        Listings.Params memory listingParams = listing.params;
        // Resolve listing controller to calculate lister fee based on selected listing strategy.
        IListingController listingController = listingRegistry.listingController(listingParams.strategy);
        fees.listerBaseFee = listingController.calculateRentalFee(listingParams, rentingParams);

        // Calculate universe base fee.
        Warpers.Warper memory warper = warperManager.warperInfo(rentingParams.warper);
        uint16 universeRentalFeePercent = universeRegistry.universeRentalFeePercent(warper.universeId);
        fees.universeBaseFee = (fees.listerBaseFee * universeRentalFeePercent) / HUNDRED_PERCENT;

        // Calculate protocol fee.
        fees.protocolFee = (fees.listerBaseFee * protocolConfig.rentalFeePercent) / HUNDRED_PERCENT;

        // Calculate warper premiums.
        (uint256 universePremium, uint256 listerPremium) = warper.controller.calculatePremiums(
            listing.asset,
            rentingParams,
            fees.universeBaseFee,
            fees.listerBaseFee
        );
        fees.listerPremium = listerPremium;
        fees.universePremium = universePremium;

        // Calculate TOTAL rental fee.
        fees.total += fees.listerBaseFee + listerPremium;
        fees.total += fees.universeBaseFee + universePremium;
        fees.total += fees.protocolFee;
    }
}
