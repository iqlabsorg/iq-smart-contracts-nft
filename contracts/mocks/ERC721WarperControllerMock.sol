// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/interfaces/IERC721.sol";

import "../warper/ERC721/ERC721WarperController.sol";

contract ERC721WarperControllerMock is ERC721WarperController {
    uint256 internal _universePremium;
    uint256 internal _listerPremium;

    function setPremiums(uint256 universePremium, uint256 listerPremium) external {
        _universePremium = universePremium;
        _listerPremium = listerPremium;
    }

    function calculatePremiums(
        Assets.Asset calldata,
        Rentings.Params calldata,
        uint256,
        uint256
    ) external view override returns (uint256, uint256) {
        return (_universePremium, _listerPremium);
    }
}
