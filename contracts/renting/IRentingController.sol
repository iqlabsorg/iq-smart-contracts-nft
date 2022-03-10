// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./Renting.sol";
import "../asset/Assets.sol";

//todo: move isCompatibleWarper here from IAssetController
interface IRentingController {
    // todo: docs
    function checkIsRentableAsset(Assets.Asset calldata asset, Renting.Params calldata rentingParams) external view;

    // todo: docs
    function calculatePremiums(
        //todo: feeModifiers?
        Assets.Asset calldata asset,
        Renting.Params calldata rentingParams,
        uint256 universeFee,
        uint256 listerFee
    ) external view returns (uint256 universePremium, uint256 listerPremium);
}
