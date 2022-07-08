// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// Libraries
import "../warper/Warpers.sol";
import "../acl/IACL.sol";
import "../universe/IUniverseRegistry.sol";
import "../asset/Assets.sol";
import "../metahub/IMetahub.sol";

abstract contract WarperManagerStorage {
    /**
     * @dev ACL contract.
     */
    IACL internal _aclContract;

    Warpers.Registry internal _warperRegistry;

    IAssetClassRegistry internal _assetClassRegistry;

    IMetahub internal _metahub;

    IUniverseRegistry internal _universeRegistry;
}
