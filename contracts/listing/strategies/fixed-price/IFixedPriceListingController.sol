// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../IListingController.sol";

interface IFixedPriceListingController is IListingController {
    /**
     * @dev Decodes listing strategy params.
     * @param params Encoded listing strategy params.
     * @return baseRate Asset renting base rate (base tokens per second).
     */
    function decodeStrategyParams(Listings.Params memory params) external pure returns (uint256 baseRate);
}
