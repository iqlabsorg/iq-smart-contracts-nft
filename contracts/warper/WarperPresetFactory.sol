// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "../acl/AccessControlledUpgradeable.sol";
import "./IWarperPresetFactory.sol";
import "./IWarperPreset.sol";
import "./WarperPresetFactoryStorage.sol";

/**
 * @title Warper preset factory contract.
 */
contract WarperPresetFactory is
    IWarperPresetFactory,
    UUPSUpgradeable,
    AccessControlledUpgradeable,
    WarperPresetFactoryStorage
{
    using ClonesUpgradeable for address;
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.Bytes32Set;

    /**
     * @dev Modifier to check that the preset is currently enabled.
     */
    modifier whenEnabled(bytes32 presetId) {
        if (!_presets[presetId].enabled) revert DisabledWarperPreset(presetId);
        _;
    }

    /**
     * @dev Modifier to check that the preset is currently disabled.
     */
    modifier whenDisabled(bytes32 presetId) {
        if (_presets[presetId].enabled) revert EnabledWarperPreset(presetId);
        _;
    }

    /**
     * @dev Constructor that gets called for the implementation contract.
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev WarperPresetFactory initializer.
     * @param acl Address of the ACL contract.
     */
    function initialize(address acl) external initializer {
        __UUPSUpgradeable_init();

        _aclContract = IACL(acl);
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function addPreset(bytes32 presetId, address implementation) external onlySupervisor {
        // Check whether provided implementation address is a contract with the correct interface.
        if (!implementation.supportsInterface(type(IWarperPreset).interfaceId)) {
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
    function removePreset(bytes32 presetId) external onlySupervisor {
        if (_presetIds.remove(presetId)) {
            delete _presets[presetId];
            emit WarperPresetRemoved(presetId);
        }
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function enablePreset(bytes32 presetId) external whenDisabled(presetId) onlySupervisor {
        _presets[presetId].enabled = true;
        emit WarperPresetEnabled(presetId);
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function disablePreset(bytes32 presetId) external whenEnabled(presetId) onlySupervisor {
        _presets[presetId].enabled = false;
        emit WarperPresetDisabled(presetId);
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function deployPreset(bytes32 presetId, bytes calldata initData) external whenEnabled(presetId) returns (address) {
        // Init data must never be empty here, because all presets have mandatory init params.
        if (initData.length == 0) {
            revert EmptyPresetData();
        }

        // Deploy warper preset implementation proxy.
        address warper = _presets[presetId].implementation.clone();

        // Initialize warper.
        warper.functionCall(initData);
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
        WarperPreset[] memory warperPresets = new WarperPreset[](length);
        for (uint256 i = 0; i < length; i++) {
            warperPresets[i] = _presets[_presetIds.at(i)];
        }
        return warperPresets;
    }

    /**
     * @inheritdoc IWarperPresetFactory
     */
    function preset(bytes32 presetId) external view returns (WarperPreset memory) {
        return _presets[presetId];
    }

    /**
     * @inheritdoc UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal virtual override onlyAdmin {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view virtual override returns (IACL) {
        return _aclContract;
    }
}
