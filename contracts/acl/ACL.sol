// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./IACL.sol";

/**
 * @title Access Control List contract
 */
contract ACL is IACL, AccessControlEnumerable {
    /**
     * @dev Supervisor controls the vault pause mode.
     */
    bytes32 public constant SUPERVISOR_ROLE = keccak256("SUPERVISOR_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SUPERVISOR_ROLE, msg.sender);
    }

    /**
     * @inheritdoc IACL
     */
    function checkRole(bytes32 role, address account) external view {
        _checkRole(role, account);
    }
}
