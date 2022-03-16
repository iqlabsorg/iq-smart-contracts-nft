// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

import "./IACL.sol";
import "./Roles.sol";

/**
 * @title Access Control List contract
 */
contract ACL is IACL, AccessControlEnumerable {
    constructor() {
        if (Roles.ADMIN != DEFAULT_ADMIN_ROLE) revert RolesContractIncorrectlyConfigured();

        _grantRole(Roles.ADMIN, msg.sender);
        _grantRole(Roles.SUPERVISOR, msg.sender);
    }

    /**
     * @inheritdoc IACL
     */
    function checkRole(bytes32 role, address account) external view {
        _checkRole(role, account);
    }

    /**
     * @inheritdoc IACL
     */
    function adminRole() external pure override returns (bytes32) {
        return Roles.ADMIN;
    }

    /**
     * @inheritdoc IACL
     */
    function supervisorRole() external pure override returns (bytes32) {
        return Roles.SUPERVISOR;
    }
}
