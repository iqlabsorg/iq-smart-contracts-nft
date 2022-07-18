// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../../acl/IACL.sol";

abstract contract FixedPriceWithRewardListingControllerStorage {
    /**
     * @dev ACL contract.
     */
    IACL internal _aclContract;
}
