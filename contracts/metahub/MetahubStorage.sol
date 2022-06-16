// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

// Libraries
import "../accounting/Accounts.sol";
import "../universe/IUniverseRegistry.sol";
import "../asset/Assets.sol";
import "../warper/Warpers.sol";
import "../listing/Listings.sol";
import "./Protocol.sol";

import "../acl/IACL.sol";

abstract contract MetahubStorage {
    /**
     * @dev ACL contract.
     */
    IACL internal _aclContract;

    /**
     * @dev Protocol configuration.
     */
    Protocol.Config internal _protocolConfig;

    /**
     * @dev Account registry contains the data about participants' accounts and their current balances.
     */
    Accounts.Registry internal _accountRegistry;

    /**
     * @dev Universe registry contains the data about all registered universes and their settings.
     */
    IUniverseRegistry internal _universeRegistry;

    /**
     * @dev Asset registry contains the data about all registered assets and supported asset classes.
     */
    Assets.Registry internal _assetRegistry;

    /**
     * @dev Warper registry contains the data about all registered warpers.
     */
    Warpers.Registry internal _warperRegistry;

    /**
     * @dev Listing registry contains the data about all listings.
     */
    Listings.Registry internal _listingRegistry;

    /**
     * @dev Renting registry contains the data about all rentals.
     */
    Rentings.Registry internal _rentingRegistry;
}
