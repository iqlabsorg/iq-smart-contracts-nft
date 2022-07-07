// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../IListingController.sol";

interface IFixedPriceWithRewardListingController is IListingController {
    /**
     * @dev Decodes listing strategy params.
     * @param params Encoded listing strategy params.
     * @return baseRate Asset renting base rate (base tokens per second).
     * @return baseRewardPercent Asset renting base reward percent.
     */
    function decodeStrategyParams(Listings.Params memory params)
        external
        pure
        returns (uint256 baseRate, uint16 baseRewardPercent);
}
