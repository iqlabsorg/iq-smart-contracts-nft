// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

library User {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    // todo: docs;
    // todo: limit cleanup cycles to 20 iterations (global constant)
    struct Info {
        EnumerableSetUpgradeable.UintSet rentals;
        EnumerableSetUpgradeable.AddressSet warpers;
        mapping(address => EnumerableSetUpgradeable.UintSet) warperRentals;
    }

    //todo: docs
    function addRentalReference(
        Info storage self,
        address warper,
        uint256 rentalId
    ) internal {
        self.warpers.add(warper);
        self.rentals.add(rentalId);
        self.warperRentals[warper].add(rentalId);
    }

    //todo: docs
    function removeRentalReference(
        Info storage self,
        address warper,
        uint256 rentalId
    ) internal {
        self.warpers.remove(warper);
        self.rentals.remove(rentalId);
        self.warperRentals[warper].remove(rentalId);
    }
}
