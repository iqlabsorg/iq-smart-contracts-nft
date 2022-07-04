// SPDX-License-Identifier: MIT
// solhint-disable no-empty-blocks
pragma solidity ^0.8.13;

import "../accounting/IPaymentManager.sol";
import "../listing/IListingManager.sol";
import "../renting/IRentingManager.sol";
import "./IProtocolConfigManager.sol";

interface IMetahub is IProtocolConfigManager, IPaymentManager, IListingManager, IRentingManager {}
