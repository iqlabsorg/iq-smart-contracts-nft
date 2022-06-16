// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../universe/IUniverseToken.sol";
import "../warper/mechanics/asset-rentability/IAssetRentabilityMechanics.sol";
import "../warper/mechanics/availability-period/IAvailabilityPeriodMechanics.sol";
import "../warper/mechanics/rental-fee-premium/IRentalFeePremiumMechanics.sol";
import "../warper/mechanics/rental-period/IRentalPeriodMechanics.sol";
import "../warper/mechanics/renting-hook/IRentingHookMechanics.sol";

contract InterfacePrinter {
    struct Interface {
        string name;
        bytes4 id;
    }

    function interfaces() external pure returns (Interface[] memory result) {
        result = new Interface[](7);
        result[0] = Interface("IUniverseToken", type(IUniverseToken).interfaceId);
        result[1] = Interface("IERC721", type(IERC721).interfaceId);
        result[2] = Interface("IAssetRentabilityMechanics", type(IAssetRentabilityMechanics).interfaceId);
        result[3] = Interface("IAvailabilityPeriodMechanics", type(IAvailabilityPeriodMechanics).interfaceId);
        result[4] = Interface("IRentalFeePremiumMechanics", type(IRentalFeePremiumMechanics).interfaceId);
        result[5] = Interface("IRentalPeriodMechanics", type(IRentalPeriodMechanics).interfaceId);
        result[6] = Interface("IRentingHookMechanics", type(IRentingHookMechanics).interfaceId);
    }
}
