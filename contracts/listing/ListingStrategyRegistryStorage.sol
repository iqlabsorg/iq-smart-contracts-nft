// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../acl/IACL.sol";
import "./IListingStrategyRegistry.sol";

abstract contract ListingStrategyRegistryStorage {
    /**
     * @dev ACL contract.
     */
    IACL internal _aclContract;

    /**
     * @dev Mapping from listing strategy ID to the listing strategy configuration.
     */
    mapping(bytes4 => IListingStrategyRegistry.StrategyConfig) internal _strategies;
}
