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

    // todo: docs
    struct RenterInfo {
        EnumerableSetUpgradeable.UintSet rentals;
        EnumerableSetUpgradeable.AddressSet warpers;
        mapping(address => EnumerableSetUpgradeable.UintSet) warperRentals;
    }

    //todo: docs
    function addRentalReference(
        RenterInfo storage self,
        address warper,
        uint256 rentalId
    ) internal {
        self.warpers.add(warper);
        self.rentals.add(rentalId);
        self.warperRentals[warper].add(rentalId);
    }

    //todo: docs
    function removeRentalReference(
        RenterInfo storage self,
        address warper,
        uint256 rentalId
    ) internal {
        self.warpers.remove(warper);
        self.rentals.remove(rentalId);
        self.warperRentals[warper].remove(rentalId);
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
    function register(Registry storage self, Agreement memory agreement) internal returns (uint256 rentalId) {
        // Generate new rental ID.
        self.idTracker.increment();
        rentalId = self.idTracker.current();
        // Save new rental agreement.
        self.agreements[rentalId] = agreement;
        // Update user rental references.
        self.renters[agreement.renter].addRentalReference(agreement.warper, rentalId);
    }
}
