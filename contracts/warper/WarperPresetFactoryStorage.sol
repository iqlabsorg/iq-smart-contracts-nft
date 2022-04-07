// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../acl/IACL.sol";
import "./WarperPresetFactoryStorage.sol";
import "./IWarperPresetFactory.sol";

contract WarperPresetFactoryStorage {
    /**
     * @dev The ACL contract address.
     */
    IACL _aclContract;

    /**
     * @dev Mapping presetId to preset struct.
     */
    mapping(bytes32 => IWarperPresetFactory.WarperPreset) internal _presets;

    /**
     * @dev Registered presets.
     */
    EnumerableSetUpgradeable.Bytes32Set internal _presetIds;
}
