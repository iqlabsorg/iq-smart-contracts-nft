// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// Libraries
import "../warper/Warpers.sol";
import "../acl/IACL.sol";
import "../universe/IUniverseRegistry.sol";
import "../asset/Assets.sol";

abstract contract WarperManagerStorage {
    /**
     * @dev ACL contract.
     */
    IACL internal _aclContract;

    /**
     * @dev Warper registry contains the data about all registered warpers.
     */
    Warpers.Registry internal _warperRegistry;

    /**
     * @dev Asset registry contains the data about all registered assets and supported asset classes.
     */
    Assets.Registry internal _assetRegistry;

    /**
     * @dev Universe registry contains the data about all registered universes and their settings.
     */
    IUniverseRegistry internal _universeRegistry;
}
