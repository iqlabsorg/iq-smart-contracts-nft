// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../accounting/Accounts.sol";
import "../asset/Assets.sol";
import "../renting/Rentings.sol";
import "../asset/IAssetController.sol";
import "./IWarper.sol";

interface IWarperController is IAssetController {
    /**
     * @dev Thrown if warper interface is not compatible with the controller.
     */
    error IncompatibleWarperInterface();

    /**
     * @dev Thrown upon attempting to use the warper with an asset different from the one expected by the warper.
     */
    error InvalidAssetForWarper(address warper, address asset);

    /**
     * @dev Thrown upon attempting to rent a warped asset which is already rented.
     */
    error AlreadyRented();

    /**
     * @dev Takes an existing asset and then mints a warper token representing it.
     *      Used in Metahub->Warper communication.
     * @param asset The asset that must be warped.
     * @param warper Warper contract to used for warping.
     * @param to The account which will receive the warped asset.
     * @return collectionId Warped collection ID.
     * @return warpedAsset Warper asset structure.
     */
    function warp(
        Assets.Asset calldata asset,
        address warper,
        address to
    ) external returns (bytes32 collectionId, Assets.Asset memory warpedAsset);

    /**
     * @dev Executes warper rental hook.
     * @param rentalId Rental agreement ID.
     * @param rentalAgreement Newly registered rental agreement details.
     * @param rentalEarnings The rental earnings breakdown.
     */
    function executeRentingHooks(
        uint256 rentalId,
        Rentings.Agreement calldata rentalAgreement,
        Accounts.RentalEarnings calldata rentalEarnings
    ) external;

    /**
     * @dev Validates that the warper interface is supported by the current WarperController.
     * @param warper Warper whose interface we must validate.
     * @return bool - `true` if warper is supported.
     */
    function isCompatibleWarper(address warper) external view returns (bool);

    /**
     * @dev Reverts if provided warper is not compatible with the controller.
     */
    function checkCompatibleWarper(address warper) external view;

    /**
     * @dev Validates renting params taking into account various warper mechanics.
     * Throws an error if the specified asset cannot be rented with particular renting parameters.
     * @param asset Asset being rented.
     * @param rentingParams Renting parameters.
     */
    function validateRentingParams(Assets.Asset calldata asset, Rentings.Params calldata rentingParams) external view;

    /**
     * @dev Calculates the universe and/or lister premiums.
     * Those are extra amounts that should be added the the resulting rental fee paid by renter.
     * @param asset Asset being rented.
     * @param rentingParams Renting parameters.
     * @param universeFee The current value of the universe fee component.
     * @param listerFee The current value of the lister fee component.
     * @return universePremium The universe premium amount.
     * @return listerPremium The lister premium amount.
     */
    function calculatePremiums(
        Assets.Asset calldata asset,
        Rentings.Params calldata rentingParams,
        uint256 universeFee,
        uint256 listerFee
    ) external view returns (uint256 universePremium, uint256 listerPremium);
}
