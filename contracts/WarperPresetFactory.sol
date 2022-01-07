// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IWarperPresetFactory.sol";

contract WarperPresetFactory is IWarperPresetFactory {
    using Clones for address;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    error DuplicateWarperPreset(bytes32 presetId);
    error DisabledWarperPreset(bytes32 presetId);
    error EnabledWarperPreset(bytes32 presetId);

    mapping(bytes32 => WarperPreset) private _presets;
    EnumerableSet.Bytes32Set private _presetIds;

    modifier whenEnabled(bytes32 presetId) {
        if (!_presets[presetId].enabled) {
            revert DisabledWarperPreset(presetId);
        }
        _;
    }

    modifier whenDisabled(bytes32 presetId) {
        if (_presets[presetId].enabled) {
            revert EnabledWarperPreset(presetId);
        }
        _;
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function addPreset(bytes32 presetId, address implementation) external override {
        // todo: onlyOwner
        if (_presetIds.add(presetId)) {
            _presets[presetId] = WarperPreset(presetId, implementation, true);
            emit WarperPresetAdded(presetId, implementation);
        } else {
            revert DuplicateWarperPreset(presetId);
        }
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function removePreset(bytes32 presetId) external override {
        // todo: onlyOwner
        if (_presetIds.remove(presetId)) {
            delete _presets[presetId];
            emit WarperPresetRemoved(presetId);
        }
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function enablePreset(bytes32 presetId) external override whenDisabled(presetId) {
        // todo: onlyOwner
        _presets[presetId].enabled = true;
        emit WarperPresetEnabled(presetId);
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function disablePreset(bytes32 presetId) external override whenEnabled(presetId) {
        // todo: onlyOwner
        _presets[presetId].enabled = false;
        emit WarperPresetDisabled(presetId);
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function isPresetEnabled(bytes32 presetId) external view override returns (bool) {
        return _presets[presetId].enabled;
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function getPresets() external view override returns (WarperPreset[] memory presets) {
        for (uint256 i = 0; i < _presetIds.length(); i++) {
            presets[i] = _presets[_presetIds.at(i)];
        }
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function getPreset(bytes32 presetId) external view override returns (WarperPreset memory) {
        return _presets[presetId];
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function deployPreset(
        bytes32 presetId,
        bytes calldata data //  solhint-disable no-unused-vars
    ) external override whenEnabled(presetId) returns (address) {
        // Deploy warper preset implementation proxy.
        address deployment = _presets[presetId].implementation.clone();
        // todo: initialize

        return deployment;
    }
}
