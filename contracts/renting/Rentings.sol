// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

// todo: limit cleanup cycles to 20 iterations (global constant)
library Rentings {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using Rentings for RenterInfo;
    using Rentings for Agreement;

    /**
     * @dev Renting parameters structure. It is used to encode all the necessary information to estimate and/or fulfill a particular renting request.
     * @param listingId Listing ID. Also allows to identify the asset being rented.
     * @param warper Warper address.
     * @param renter Renter address.
     * @param rentalPeriod Desired period of asset renting.
     */
    struct Params {
        uint256 listingId;
        address warper;
        address renter;
        uint32 rentalPeriod;
    }

    // todo: docs
    struct Agreement {
        uint256 listingId;
        address warper;
        address renter;
        uint32 startTime;
        uint32 endTime;
    }

    function isEffective(Agreement storage self) internal view returns (bool) {
        return self.endTime > uint32(block.timestamp);
    }

    function duration(Agreement storage self) internal view returns (uint32) {
        return self.endTime - self.startTime;
    }

    // todo: docs
    struct RenterInfo {
        EnumerableSetUpgradeable.UintSet rentalIndex;
        EnumerableSetUpgradeable.AddressSet warpers;
        mapping(address => EnumerableSetUpgradeable.UintSet) warperRentalIndex;
    }

    //todo: docs
    function addRentalData(
        RenterInfo storage self,
        address warper,
        uint256 rentalId
    ) internal {
        self.warpers.add(warper);
        self.rentalIndex.add(rentalId);
        self.warperRentalIndex[warper].add(rentalId);
    }

    //todo: docs
    function removeRentalData(
        RenterInfo storage self,
        address warper,
        uint256 rentalId
    ) internal {
        self.warpers.remove(warper);
        self.rentalIndex.remove(rentalId);
        self.warperRentalIndex[warper].remove(rentalId);
    }

    /**
     * @dev Renting registry
     * @param idTracker Rental agreement ID tracker (incremental counter).
     * @param agreements Mapping from rental agreement ID to the rental agreement details.
     */
    struct Registry {
        CountersUpgradeable.Counter idTracker; // todo: reduce size
        mapping(uint256 => Agreement) agreements;
        mapping(address => RenterInfo) renters;
    }

    //todo: docs
    function add(Registry storage self, Agreement memory agreement) internal returns (uint256 rentalId) {
        // Generate new rental ID.
        self.idTracker.increment();
        rentalId = self.idTracker.current();
        // Save new rental agreement.
        self.agreements[rentalId] = agreement;
        // Add user rental data.
        self.renters[agreement.renter].addRentalData(agreement.warper, rentalId);
    }

    //todo: docs
    function remove(Registry storage self, uint256 rentalId) internal {
        address renter = self.agreements[rentalId].renter;
        address warper = self.agreements[rentalId].warper;
        // Remove user rental data.
        self.renters[renter].removeRentalData(warper, rentalId);
        // Delete rental agreement.
        delete self.agreements[rentalId];
    }

    //todo: docs
    function renterActiveRentalCountByWarper(
        Registry storage self,
        address renter,
        address warper
    ) internal view returns (uint256 count) {
        EnumerableSetUpgradeable.UintSet storage rentalIndex = self.renters[renter].warperRentalIndex[warper];
        uint256 length = rentalIndex.length();
        for (uint256 i = 0; i < length; i++) {
            if (self.agreements[rentalIndex.at(i)].isEffective()) count++;
        }
    }
}
