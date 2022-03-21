// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../IWarperController.sol";
import "../../asset/Assets.sol";
import "../../renting/IRentingManager.sol";

interface IERC721WarperController is IWarperController {
    /**
     * @dev Takes an existing asset and then mints a warper token representing it.
     *      Used in Metahub->Warper communication.
     * @param asset Represents the asset that must be warped.
     * @param renter The renter address of the asset.
     */
    function warp(Assets.Asset calldata asset, address renter) external;

    /**
     * @dev Get the active rental count for a given warper and a renter.
     *      Used in Warper->Metahub communication.
     * @param warper Address of the warper.
     * @param renter Address of the renter whose active rental counts we need to fetch.
     */
    function activeRentalCount(
        address metahub,
        address warper,
        address renter
    ) external view returns (uint256);

    /**
     * @dev Get the rental status of a specific token.
     *      Used in Warper->Metahub communication.
     * @param warper Address of the warper.
     * @param tokenId The token ID to be checked for status.
     */
    function rentalStatus(
        address metahub,
        address warper,
        uint256 tokenId
    ) external view returns (IRentingManager.RentalStatus);
}
