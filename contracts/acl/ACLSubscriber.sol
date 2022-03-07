// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./IACLSubscriber.sol";

/**
 * @title Modifier provider for contracts that want to interact with the ACL contract.
 */
abstract contract ACLSubscriber is IACLSubscriber {
    /**
     * @dev Modifier to make a function callable by the admin account.
     */
    modifier onlyAdmin() {
        ACL acl = this.getAcl();
        acl.checkRole(acl.DEFAULT_ADMIN_ROLE(), msg.sender);
        _;
    }

    /**
     * @dev Modifier to make a function callable by a supervisor account.
     */
    modifier onlySupervisor() {
        ACL acl = this.getAcl();
        acl.checkRole(acl.SUPERVISOR_ROLE(), msg.sender);
        _;
    }
}
