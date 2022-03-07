// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../acl/AccessControlled.sol";
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
abstract contract AssetVault is IAssetVault, AccessControlled, Pausable {
    /**
     * @dev Vault recovery mode state.
     */
    bool private _recovery;

    /**
     * @dev Metahub address.
     */
    address private _metahub;

    /**
     * @dev ACL contract.
     */
    IACL private _aclContract;

    /**
     * @dev Constructor.
     * @param metahub Metahub address.
     * @param acl ACL address.
     */
    constructor(address metahub, address acl) {
        _recovery = false;

        // todo validate interface
        _metahub = metahub;

        // todo validate interface
        _aclContract = IACL(acl);
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
     * @inheritdoc AccessControlled
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }
}
