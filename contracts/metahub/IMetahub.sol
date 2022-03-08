// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IAssetClassManager.sol";
import "./IUniverseManager.sol";
import "./IWarperManager.sol";
import "./IListingManager.sol";
import "./IRentingManager.sol";
import "./IPricingManager.sol";

interface IMetahub is
    IAssetClassManager,
    IUniverseManager,
    IWarperManager,
    IListingManager,
    IRentingManager,
    IPricingManager
{}
