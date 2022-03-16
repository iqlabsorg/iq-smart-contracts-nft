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
     * @dev Thrown when the current time is not withing the warper availability period.
     */
    error WarperIsNotAvailableForRenting(
        uint256 currentTime,
        uint32 availabilityPeriodStart,
        uint32 availabilityPeriodEnd
    );

    /**
     * @dev Thrown when the requested rental period is not withing the warper allowed rental period range.
     */
    error WarperRentalPeriodIsOutOfRange(uint32 requestedRentalPeriod, uint32 minRentalPeriod, uint32 maxRentalPeriod);

    /**
     * @dev Validates that the warper interface is supported by the current WarperController.
     * @param warper Warper whose interface we must validate.
     * @return bool - `true` if warper is supported.
     */
    function isCompatibleWarper(IWarper warper) external view returns (bool);

    /**
     * @dev Validates renting params taking into account various warper mechanics.
     * Throws an error if the specified asset cannot be rented with particular renting parameters.
     * @param asset Asset being rented.
     * @param rentingParams Renting parameters.
     */
    function validateRentingParams(Assets.Asset calldata asset, Rentings.Params calldata rentingParams) external view;

    // todo: docs
    function calculatePremiums(
        Assets.Asset calldata asset,
        Rentings.Params calldata rentingParams,
        uint256 universeFee,
        uint256 listerFee
    ) external view returns (uint256 universePremium, uint256 listerPremium);
}
