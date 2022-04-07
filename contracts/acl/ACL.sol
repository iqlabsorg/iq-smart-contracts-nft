// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

import "./IACL.sol";
import "./AccessControlledUpgradeable.sol";
import "./Roles.sol";

/**
 * @title Access Control List contract
 */
contract ACL is IACL, AccessControlEnumerableUpgradeable, AccessControlledUpgradeable, UUPSUpgradeable {
    /**
     * @dev Constructor that gets called for the implementation contract.
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev ACL initializer.
     */
    function initialize() external initializer {
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();

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

    /**
     * @inheritdoc UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyAdmin {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view virtual override returns (IACL) {
        return IACL(address(this));
    }
}
