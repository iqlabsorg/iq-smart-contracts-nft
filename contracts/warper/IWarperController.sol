// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../asset/Assets.sol";
import "../renting/Rentings.sol";
import "../asset/IAssetController.sol";
import "./IWarper.sol";

interface IWarperController is IAssetController {
    //todo: docs
    error AssetIsNotRentable(string reason);

    /**
     * @dev Validates that the warper interface is supported by the current WarperController.
     * @param warper Warper whose interface we must validate.
     * @return bool - `true` if warper is supported.
     */
    function isCompatibleWarper(IWarper warper) external view returns (bool);

    // todo: docs
    function validateRentingParams(Assets.Asset calldata asset, Rentings.Params calldata rentingParams) external view;

    // todo: docs
    function calculatePremiums(
        Assets.Asset calldata asset,
        Rentings.Params calldata rentingParams,
        uint256 universeFee,
        uint256 listerFee
    ) external view returns (uint256 universePremium, uint256 listerPremium);
}
