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
error VaultIsInRecoveryMode();

/**
 * @dev Thrown when there is an attempt to revoke default admin role.
 */
error CannotRevokeDefaultAdminRole();

/**
 * @dev Thrown when the asset return is not allowed, due to the vault state or the caller permissions.
 */
error AssetReturnIsNotAllowed();

/**
 * @dev Thrown when the asset deposit is not allowed, due to the vault state or the caller permissions.
 */
error AssetDepositIsNotAllowed();

/**
 * @dev During the normal operation time, only Metahub contract is allowed to initiate asset return to the original asset owner.
 * In case of emergency, the vault admin can switch vault to recovery mode, therefore allowing anyone to initiate asset return.
 * NOTE: There is no way to transfer asset from the vault to an arbitrary address. The asset can only be returned to the rightful owner.
 *
 * Warning: All tokens transferred to the vault contract directly (not by Metahub contract) will be lost forever!!!
 *
 */
abstract contract AssetVault is IAssetVault, AccessControl, Pausable {
    /**
     * @dev Supervisor controls the vault pause mode.
     */
    bytes32 public constant SUPERVISOR_ROLE = keccak256("SUPERVISOR_ROLE");

    /**
     * @dev Vault recovery mode state.
     */
    bool private _recovery;

    /**
     * @dev Metahub address.
     */
    address private _metahub;

    /**
     * @dev Constructor.
     * @param metahub Metahub address.
     */
    constructor(address metahub) {
        _recovery = false;
        _metahub = metahub;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SUPERVISOR_ROLE, msg.sender);
    }

    /**
     * @dev Modifier to check asset deposit possibility.
     */
    modifier whenAssetDepositAllowed(address operator) {
        if (operator == _metahub && !paused() && !_recovery) _;
        else revert AssetDepositIsNotAllowed();
    }

    /**
     * @dev Modifier to check asset return possibility.
     */
    modifier whenAssetReturnAllowed() {
        if ((_msgSender() == _metahub && !paused()) || _recovery) _;
        else revert AssetReturnIsNotAllowed();
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
     * @dev Modifier to make a function callable only when the vault is not in recovery mode.
     */
    modifier whenNotRecovery() {
        if (_recovery) revert VaultIsInRecoveryMode();
        _;
    }

    /**
     * @inheritdoc IAssetVault
     */
    function pause() external onlySupervisor whenNotRecovery {
        _pause();
    }

    /**
     * @inheritdoc IAssetVault
     */
    function unpause() external onlySupervisor whenNotRecovery {
        _unpause();
    }

    /**
     * @inheritdoc IAssetVault
     */
    function switchToRecoveryMode() external onlyAdmin whenNotRecovery {
        _recovery = true;
        emit RecoveryModeActivated(_msgSender());
    }

    /**
     * @inheritdoc IAssetVault
     */
    function metahub() public view returns (address) {
        return _metahub;
    }

    /**
     * @inheritdoc IAssetVault
     */
    function isRecovery() public view returns (bool) {
        return _recovery;
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
