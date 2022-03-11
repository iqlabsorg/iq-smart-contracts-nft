// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../IListingController.sol";
import "../Listings.sol";
import "../ListingController.sol";

contract FixedPriceListingController is ListingController {
    /**
     * @inheritdoc IListingController
     */
    function strategyId() external pure returns (bytes4) {
        return Listings.FIXED_PRICE;
    }

    /**
     * @inheritdoc IListingController
     */
    function calculateListerFee(Listings.Params calldata strategyParams, Rentings.Params calldata rentingParams)
        external
        view
        returns (uint256)
    {
        uint256 baseRate = _decodeStrategyParams(strategyParams);
        return rentingParams.rentalPeriod * baseRate;
    }

    /**
     * @dev Decodes listing strategy params.
     * @param params Encoded listing strategy params.
     * @return baseRate Asset renting base rate (base tokens per second).
     */
    function _decodeStrategyParams(Listings.Params memory params) internal pure virtual returns (uint256 baseRate) {
        // Ensure correct strategy ID.
        if (params.strategy != Listings.FIXED_PRICE) {
            revert ListingStrategyMismatch(params.strategy, Listings.FIXED_PRICE);
        }
        return abi.decode(params.data, (uint256));
    }
}
