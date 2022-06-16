// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../universe/IUniverseToken.sol";
import "../warper/mechanics/asset-rentability/IAssetRentabilityMechanics.sol";
import "../warper/mechanics/availability-period/IAvailabilityPeriodMechanics.sol";
import "../warper/mechanics/rental-fee-premium/IRentalFeePremiumMechanics.sol";
import "../warper/mechanics/rental-period/IRentalPeriodMechanics.sol";
import "../warper/mechanics/renting-hook/IRentingHookMechanics.sol";

contract SolidityInterfaces {
    struct Interface {
        string name;
        bytes4 id;
    }

    Interface[] internal _list;

    constructor() {
        _list.push(Interface("IUniverseToken", type(IUniverseToken).interfaceId));
        _list.push(Interface("IERC721", type(IERC721).interfaceId));
        _list.push(Interface("IAssetRentabilityMechanics", type(IAssetRentabilityMechanics).interfaceId));
        _list.push(Interface("IAvailabilityPeriodMechanics", type(IAvailabilityPeriodMechanics).interfaceId));
        _list.push(Interface("IRentalFeePremiumMechanics", type(IRentalFeePremiumMechanics).interfaceId));
        _list.push(Interface("IRentalPeriodMechanics", type(IRentalPeriodMechanics).interfaceId));
        _list.push(Interface("IRentingHookMechanics", type(IRentingHookMechanics).interfaceId));
    }

    function list() external view returns (Interface[] memory) {
        return _list;
    }
}
