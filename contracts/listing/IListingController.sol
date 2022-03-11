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

    //todo: docs
    function calculateListerFee(Listings.Params calldata listingParams, Rentings.Params calldata rentingParams)
        external
        view
        returns (uint256);
}
