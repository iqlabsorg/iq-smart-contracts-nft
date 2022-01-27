// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

/**
 * @dev Thrown when the message sender doesn't match the Metahub address.
 */
error CallerIsNotMetahub();

/**
 * @dev Thrown when the provided preset initialization data is empty.
 */
error EmptyPresetData();
