// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IRentingController.sol";

contract ERC721RentingController is IRentingController {
    /**
     * @inheritdoc IRentingController
     */
    function checkIsRentableAsset(Assets.Asset calldata asset, Renting.Params calldata rentingParams) external view {
        // todo: analyse warper mechanics (use supportsInterfaces from ERC165Checker)
        //todo: call warper checkAssetRentable mechanics (false, error message)
        // todo: revert AssetNotRentable(error)
        //todo: check warper availability period (if supported)
        //todo: check warper min/max rental period (if supported)
    }

    /**
     * @inheritdoc IRentingController
     */
    function calculatePremiums(
        Assets.Asset calldata asset,
        Renting.Params calldata rentingParams,
        uint256 universeFee,
        uint256 listerFee
    ) external view returns (uint256 universePremium, uint256 listerPremium) {
        // todo: check interface support, call warper or fallback to (0, 0)
    }
}
