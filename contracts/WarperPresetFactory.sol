// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IWarperPresetFactory.sol";
import "./interfaces/IWarper.sol";

contract WarperPresetFactory is IWarperPresetFactory {
    using Clones for address;
    using Address for address;
    using ERC165Checker for address;

    using EnumerableSet for EnumerableSet.Bytes32Set;

    error InvalidWarperPresetInterface();
    error DuplicateWarperPresetId(bytes32 presetId);
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
        // Check whether provided implementation address is a contract with the correct interface.
        if (!implementation.supportsInterface(type(IWarper).interfaceId)) {
            revert InvalidWarperPresetInterface();
        }

        if (_presetIds.add(presetId)) {
            _presets[presetId] = WarperPreset(presetId, implementation, true);
            emit WarperPresetAdded(presetId, implementation);
        } else {
            revert DuplicateWarperPresetId(presetId);
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
    function getPresets() external view override returns (WarperPreset[] memory) {
        uint256 length = _presetIds.length();
        WarperPreset[] memory presets = new WarperPreset[](length);
        for (uint256 i = 0; i < length; i++) {
            presets[i] = _presets[_presetIds.at(i)];
        }
        return presets;
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
    function deployPreset(bytes32 presetId, bytes[] calldata initData)
        external
        override
        whenEnabled(presetId)
        returns (address)
    {
        // Deploy warper preset implementation proxy.
        address warper = _presets[presetId].implementation.clone();
        for (uint256 i = 0; i < initData.length; i++) {
            warper.functionCall(initData[i]);
        }

        emit WarperPresetDeployed(presetId, warper);
        return warper;
    }
}
