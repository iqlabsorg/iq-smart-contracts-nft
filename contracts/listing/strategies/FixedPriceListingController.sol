// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../IListingController.sol";
import "../ListingStrategy.sol";
import "../ListingController.sol";

contract FixedPriceListingController is IListingController, ListingController {
    /**
     * @inheritdoc IListingController
     */
    function strategyId() external pure returns (bytes4) {
        return ListingStrategy.FIXED_PRICE;
    }

    /**
     * @dev Decodes listing strategy params.
     * @param params Encoded listing strategy params.
     * @return baseRate Asset renting base rate (base tokens per second).
     */
    function _decodeStrategyParams(ListingStrategy.Params memory params)
        internal
        pure
        virtual
        returns (uint256 baseRate)
    {
        // Ensure correct strategy ID.
        if (params.id != ListingStrategy.FIXED_PRICE) {
            revert ListingStrategyMismatch(params.id, ListingStrategy.FIXED_PRICE);
        }
        return abi.decode(params.data, (uint256));
    }
}
