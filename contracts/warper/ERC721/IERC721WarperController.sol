// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../IWarperController.sol";
import "../../asset/Assets.sol";

interface IERC721WarperController is IWarperController {
    /**
     * @dev Get the active rental balance for a given warper and a renter.
     *      Used in Warper->Metahub communication.
     * @param metahub Address of the metahub.
     * @param warper Address of the warper.
     * @param renter Address of the renter whose active rental counts we need to fetch.
     */
    function rentalBalance(
        address metahub,
        address warper,
        address renter
    ) external view returns (uint256);

    /**
     * @dev Get the rental status of a specific token.
     *      Used in Warper->Metahub communication.
     * @param metahub Address of the metahub.
     * @param warper Address of the warper.
     * @param tokenId The token ID to be checked for status.
     */
    function rentalStatus(
        address metahub,
        address warper,
        uint256 tokenId
    ) external view returns (Rentings.RentalStatus);
}
