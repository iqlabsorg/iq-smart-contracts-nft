// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../acl/IACL.sol";
import "./IAssetClassRegistry.sol";

abstract contract AssetClassRegistryStorage {
    /**
     * @dev ACL contract.
     */
    IACL internal _aclContract;

    /**
     * @dev Mapping from asset class ID to the asset class configuration.
     */
    mapping(bytes4 => IAssetClassRegistry.ClassConfig) internal _classes;
}
