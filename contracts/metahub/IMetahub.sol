// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../accounting/IPaymentManager.sol";
import "../universe/IUniverseManager.sol";
import "../warper/IWarperManager.sol";
import "../listing/IListingManager.sol";
import "../renting/IRentingManager.sol";

interface IMetahub is IPaymentManager, IUniverseManager, IWarperManager, IListingManager, IRentingManager {}
