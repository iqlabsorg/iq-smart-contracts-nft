// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IAssetVault {
    /**
     * @dev Emitted when the vault is switched to recovery mode by `account`.
     */
    event RecoveryModeActivated(address account);

    /**
     * @dev Activates asset recovery mode.
     * Emits a {RecoveryModeActivated} event.
     */
    function switchToRecoveryMode() external;

    /**
     * @dev Pauses the vault.
     */
    function pause() external;

    /**
     * @dev Unpauses the vault.
     */
    function unpause() external;

    /**
     * @dev Returns vault asset class.
     * @return Asset class ID.
     */
    function assetClass() external pure returns (bytes4);

    /**
     * @dev Returns the Metahub address.
     */
    function metahub() external view returns (address);

    /**
     * @dev Returns vault recovery mode flag state.
     * @return True when the vault is in recovery mode.
     */
    function isRecovery() external view returns (bool);
}
