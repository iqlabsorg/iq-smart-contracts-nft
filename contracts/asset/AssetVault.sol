// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./IAssetVault.sol";

/**
 * @dev Thrown when the asset is not is found among vault inventory.
 */
error AssetNotFound();

/**
 * @dev Thrown when the function is called on the vault in recovery mode.
 */
error VaultNotOperational();

/**
 * @dev Thrown when there is an attempt to revoke default admin role.
 */
error CannotRevokeDefaultAdminRole();

/**
 * @dev Thrown when the asset return is not allowed, due to the vault state or message sender role.
 */
error AssetReturnNotAllowed();

abstract contract AssetVault is IAssetVault, AccessControl, Pausable {
    /**
     * @dev Supervisor controls the vault pause mode.
     */
    bytes32 public constant SUPERVISOR_ROLE = keccak256("SUPERVISOR_ROLE");

    /**
     * @dev Operator can return assets to the original owner (in normal mode).
     */
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    /**
     * @dev Vault recovery mode state.
     */
    bool private _recoveryMode;

    /**
     * @dev Constructor.
     * @param operator First operator account.
     */
    constructor(address operator) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SUPERVISOR_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, operator);
    }

    /**
     * @dev Modifier to check asset return possibility.
     */
    modifier whenAssetReturnAllowed() {
        if (
            (hasRole(OPERATOR_ROLE, _msgSender()) && !paused()) ||
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) ||
            _recoveryMode
        ) {
            _;
        }
        revert AssetReturnNotAllowed();
    }

    /**
     * @dev Modifier to make a function callable only by the vault operator.
     */
    modifier onlyOperator() {
        _checkRole(OPERATOR_ROLE, _msgSender());
        _;
    }
    /**
     * @dev Modifier to make a function callable only by the vault administrator.
     */
    modifier onlyAdmin() {
        _checkRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _;
    }

    /**
     * @dev Modifier to make a function callable only by the vault supervisor.
     */
    modifier onlySupervisor() {
        _checkRole(SUPERVISOR_ROLE, _msgSender());
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the vault is not shut down.
     */
    modifier whenOperational() {
        if (_recoveryMode) revert VaultNotOperational();
        _;
    }

    /**
     * @inheritdoc IAssetVault
     */
    function pause() external onlySupervisor whenOperational {
        _pause();
    }

    /**
     * @inheritdoc IAssetVault
     */
    function unpause() external onlySupervisor whenOperational {
        _unpause();
    }

    /**
     * @inheritdoc IAssetVault
     */
    function shutDown() external onlyAdmin whenOperational {
        _recoveryMode = true;
        emit ShutDown(_msgSender());
    }

    /**
     * @inheritdoc AccessControl
     * @dev Prevent revoking default admin role.
     */
    function _revokeRole(bytes32 role, address account) internal override {
        if (role == DEFAULT_ADMIN_ROLE) revert CannotRevokeDefaultAdminRole();
        super._revokeRole(role, account);
    }
}
