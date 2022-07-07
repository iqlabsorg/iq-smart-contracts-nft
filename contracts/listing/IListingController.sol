// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "./Listings.sol";
import "../renting/Rentings.sol";

interface IListingController is IERC165 {
    /**
     * @dev Thrown when the listing strategy ID does not match the required one.
     * @param provided Provided listing strategy ID.
     * @param required Required listing strategy ID.
     */
    error ListingStrategyMismatch(bytes4 provided, bytes4 required);

    /**
     * @dev Returns implemented strategy ID.
     * @return Listing strategy ID.
     */
    function strategyId() external pure returns (bytes4);

    /**
     * @dev Calculates rental fee based on renting params and implemented listing strategy.
     * @param listingParams Listing strategy params.
     * @param rentingParams Renting params.
     * @return Asset rental fee (base tokens per second).
     */
    function calculateRentalFee(Listings.Params calldata listingParams, Rentings.Params calldata rentingParams)
        external
        view
        returns (uint256);
}
