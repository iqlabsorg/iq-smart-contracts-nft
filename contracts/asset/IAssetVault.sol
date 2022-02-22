// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IAssetVault {
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

    /**
     * @dev Returns vault asset class.
     * @return Asset class ID.
     */
    function assetClass() external pure returns (bytes4);
}
