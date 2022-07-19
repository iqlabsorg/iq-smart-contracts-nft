// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity ^0.8.13;

import "../../../renting/Rentings.sol";
import "../../../accounting/Accounts.sol";

interface IRentingHookMechanics {
    /**
     * @dev Thrown when the renting hook execution failed due to the `reason`.
     */
    error RentingHookError(string reason);

    /**
     * @dev Executes arbitrary logic after successful renting.
     * NOTE: This function should not revert directly and must set correct `success` value instead.
     *
     * @param rentalId Rental agreement ID.
     * @param tokenId The token ID.
     * @param amount The token amount.
     * @param rentalAgreement Newly registered rental agreement details.
     * @param rentalEarnings The rental earnings breakdown.
     * @return success True if hook was executed successfully.
     * @return errorMessage The reason of the hook execution failure.
     */
    function __onRent(
        uint256 rentalId,
        uint256 tokenId,
        uint256 amount,
        Rentings.Agreement calldata rentalAgreement,
        Accounts.RentalEarnings calldata rentalEarnings
    ) external returns (bool success, string memory errorMessage);
}
