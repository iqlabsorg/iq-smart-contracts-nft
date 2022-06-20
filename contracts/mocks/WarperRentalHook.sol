// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity ^0.8.13;

import "../warper/ERC721/ERC721Warper.sol";
import "../warper/mechanics/renting-hook/IRentingHookMechanics.sol";

contract WarperWithRenting is IRentingHookMechanics, ERC721Warper {
    uint256 public rentalId;
    uint256 public tokenId;
    uint256 public amount;
    Rentings.Agreement public rentalAgreement;
    Accounts.RentalEarnings public rentalEarnings;

    bool public successState = true;

    function __initialize(address original, address metahub) external virtual warperInitializer {
        _Warper_init(original, metahub);
    }

    function setSuccessState(bool successState_) external {
        successState = successState_;
    }

    function __onRent(
        uint256 rentalId_,
        uint256 tokenId_,
        uint256 amount_,
        Rentings.Agreement calldata rentalAgreement_,
        Accounts.RentalEarnings calldata rentalEarnings_
    ) external override returns (bool success, string memory errorMessage) {
        rentalId = rentalId_;
        tokenId = tokenId_;
        amount = amount_;
        rentalAgreement = rentalAgreement_;
        rentalEarnings = rentalEarnings_;

        success = successState;
        errorMessage = "There was an error!";
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == type(IRentingHookMechanics).interfaceId || super.supportsInterface(interfaceId);
    }
}
