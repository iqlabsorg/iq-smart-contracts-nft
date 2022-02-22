// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IAssetVaultSecurity {
    /**
     * @dev Emitted when the vault is shut down by `account`.
     */
    event ShutDown(address account);

    /**
     * @dev Shuts the vault down and activates recovery protocol.
     */
    function shutDown() external;

    /**
     * @dev Pauses the vault.
     */
    function pause() external;

    /**
     * @dev Unpauses the vault.
     */
    function unpause() external;
}
