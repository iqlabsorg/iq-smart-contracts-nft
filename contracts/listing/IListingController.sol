// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "./Listings.sol";
import "../renting/Rentings.sol";

interface IListingController is IERC165 {
    /**
     * @dev Returns implemented strategy ID.
     * @return Listing strategy ID.
     */
    function strategyId() external pure returns (bytes4);

    /**
     * @dev Calculates rental fee based on renting params and implemented listing strategy.
     * @param listingParams Listing strategy params.
     * @param rentingParams Renting params.
     * @return Rental fee.
     */
    function calculateRentalFee(Listings.Params calldata listingParams, Rentings.Params calldata rentingParams)
        external
        view
        returns (uint256);
}
