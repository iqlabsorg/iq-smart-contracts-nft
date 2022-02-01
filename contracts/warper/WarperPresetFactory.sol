// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Errors.sol";
import "./IWarperPresetFactory.sol";
import "./IWarper.sol";

error InvalidWarperPresetInterface();
error DuplicateWarperPresetId(bytes32 presetId);
error DisabledWarperPreset(bytes32 presetId);
error EnabledWarperPreset(bytes32 presetId);

contract WarperPresetFactory is IWarperPresetFactory, Ownable {
    using Clones for address;
    using Address for address;
    using ERC165Checker for address;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /**
     * @dev Mapping presetId to preset struct.
     */
    mapping(bytes32 => WarperPreset) private _presets;

    /**
     * @dev Registered presets.
     */
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
    function addPreset(bytes32 presetId, address implementation) external onlyOwner {
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
    function removePreset(bytes32 presetId) external onlyOwner {
        if (_presetIds.remove(presetId)) {
            delete _presets[presetId];
            emit WarperPresetRemoved(presetId);
        }
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function enablePreset(bytes32 presetId) external whenDisabled(presetId) onlyOwner {
        _presets[presetId].enabled = true;
        emit WarperPresetEnabled(presetId);
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function disablePreset(bytes32 presetId) external whenEnabled(presetId) onlyOwner {
        _presets[presetId].enabled = false;
        emit WarperPresetDisabled(presetId);
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function deployPreset(bytes32 presetId, bytes[] calldata initData)
        external
        whenEnabled(presetId)
        returns (address)
    {
        // Deploy warper preset implementation proxy.
        address warper = _presets[presetId].implementation.clone();
        for (uint256 i = 0; i < initData.length; i++) {
            if (initData[i].length == 0) {
                revert EmptyPresetData();
            }
            warper.functionCall(initData[i]);
        }

        emit WarperPresetDeployed(presetId, warper);
        return warper;
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function presetEnabled(bytes32 presetId) external view returns (bool) {
        return _presets[presetId].enabled;
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function presets() external view returns (WarperPreset[] memory) {
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
    function preset(bytes32 presetId) external view returns (WarperPreset memory) {
        return _presets[presetId];
    }
}
