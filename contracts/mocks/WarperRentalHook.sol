// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity 0.8.13;

import "../warper/ERC721/ERC721Warper.sol";
import "../warper/mechanics/renting-hook/IRentingHookMechanics.sol";

contract WarperWithRenting is IRentingHookMechanics, ERC721Warper {
    bool public onRentCalled;

    function __initialize(address original, address metahub) external virtual initializer {
        _Warper_init(original, metahub);
    }

    function __onRent(
        uint256 rentalId,
        uint256 tokenId,
        uint256 amount,
        Rentings.Agreement calldata rentalAgreement,
        Accounts.RentalEarnings calldata rentalEarnings
    ) external override returns (bool success, string memory errorMessage) {
        onRentCalled = true;
        success = true;
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IRentingHookMechanics).interfaceId || super.supportsInterface(interfaceId);
    }
}
