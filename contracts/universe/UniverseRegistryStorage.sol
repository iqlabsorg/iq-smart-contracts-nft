// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../acl/IACL.sol";
import "./UniverseToken.sol";
import "./IUniverseRegistry.sol";

/**
 * @title Universe Registry storage contract.
 */
abstract contract UniverseRegistryStorage {
    struct Universe {
        string name;
        uint16 rentalFeePercent;
    }

    /**
     * @dev ACL contract address.
     */
    IACL internal _aclContract;

    /**
     * @dev Universe token address.
     */
    IUniverseToken internal _universeToken;

    /**
     * @dev Mapping from token ID to the Universe structure.
     */
    mapping(uint256 => Universe) internal _universes;
}
