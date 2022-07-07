// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Listings.sol";

interface IListingStrategyResolver {
    function resolveListingStrategies(uint256 listingId, address warper)
        external
        view
        returns (Listings.Params[] memory);

    function resolveListingGroupStrategies(uint256 listingGroupId, address warper)
        external
        view
        returns (Listings.Params[] memory);
}
