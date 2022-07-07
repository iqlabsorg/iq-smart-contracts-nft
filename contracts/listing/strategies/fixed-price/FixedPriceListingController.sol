// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IFixedPriceListingController.sol";
import "../../ListingController.sol";

contract FixedPriceListingController is IFixedPriceListingController, ListingController {
    /**
     * @inheritdoc IListingController
     */
    function calculateRentalFee(Listings.Params calldata strategyParams, Rentings.Params calldata rentingParams)
        external
        pure
        returns (uint256)
    {
        uint256 baseRate = decodeStrategyParams(strategyParams);
        return rentingParams.rentalPeriod * baseRate;
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view override(ListingController, IERC165) returns (bool) {
        return interfaceId == type(IFixedPriceListingController).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IListingController
     */
    function strategyId() public pure override(ListingController, IListingController) returns (bytes4) {
        return Listings.FIXED_PRICE;
    }

    /**
     * @inheritdoc IFixedPriceListingController
     */
    function decodeStrategyParams(Listings.Params memory params)
        public
        pure
        compatibleStrategy(params.strategy)
        returns (uint256 baseRate)
    {
        return abi.decode(params.data, (uint256));
    }
}
