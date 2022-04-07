// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/utils/Context.sol";

import "./Roles.sol";
import "./IACL.sol";

/**
 * @title Modifier provider for contracts that want to interact with the ACL contract.
 */
abstract contract AccessControlled is Context {
    /**
     * @dev Modifier to make a function callable by the admin account.
     */
    modifier onlyAdmin() {
        _acl().checkRole(Roles.ADMIN, _msgSender());
        _;
    }

    /**
     * @dev Modifier to make a function callable by a supervisor account.
     */
    modifier onlySupervisor() {
        _acl().checkRole(Roles.SUPERVISOR, _msgSender());
        _;
    }

    /**
     * @dev return the IACL address
     */
    function _acl() internal view virtual returns (IACL);
}
