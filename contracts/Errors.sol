// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

/**
 * @dev Thrown when the message sender doesn't match the warper admin address.
 */
error CallerIsNotWarperAdmin();

/**
 * @dev Thrown when the message sender doesn't match the Metahub address.
 */
error CallerIsNotMetahub();

/**
 * @dev Thrown when the provided preset initialization data is empty.
 */
error EmptyPresetData();

/**
 * @dev Thrown when the original asset contract does not implement the interface, expected by Warper.
 */
error InvalidOriginalTokenInterface(address original, bytes4 requiredInterfaceId);

/**
 * @dev Thrown when the asset has invalid class for specific operation.
 * @param actual Actual class ID.
 * @param required Required class ID.
 */
error AssetClassMismatch(bytes4 actual, bytes4 required);

/**
 * @dev Thrown when the vault contract does not implement the interface, expected by controller.
 */
error InvalidVaultInterface(address vault, bytes4 requiredInterfaceId);
