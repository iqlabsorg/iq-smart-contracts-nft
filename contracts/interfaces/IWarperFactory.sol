// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IWarperFactory {
    struct WarperPreset {
        bytes32 id;
        address implementation;
        bool enabled;
    }

    /**
     * @dev Emitted when new warper preset is added.
     */
    event WarperPresetAdded(bytes32 indexed presetId, address indexed implementation);

    /**
     * @dev Emitted when a warper preset is disabled.
     */
    event WarperPresetDisabled(bytes32 indexed presetId);

    /**
     * @dev Emitted when a warper preset is enabled.
     */
    event WarperPresetEnabled(bytes32 indexed presetId);

    /**
     * @dev Emitted when a warper preset is enabled.
     */
    event WarperPresetRemoved(bytes32 indexed presetId);

    /**
     * @dev Emitted when a warper preset is deployed.
     */
    event WarperPresetDeployed(bytes32 indexed presetId, address indexed deployment);

    /**
     * @dev Stores the association between `presetId` and `implementation` address.
     * NOTE: Warper `implementation` must be deployed beforehand.
     * @param presetId Warper preset id.
     * @param implementation Warper implementation address.
     */
    function addPreset(bytes32 presetId, address implementation) external;

    /**
     * @dev Removes the association between `presetId` and its implementation.
     * @param presetId Warper preset id.
     */
    function removePreset(bytes32 presetId) external;

    /**
     * @dev Enables warper preset, which makes it deployable.
     * @param presetId Warper preset id.
     */
    function enablePreset(bytes32 presetId) external;

    /**
     * @dev Disable warper preset, which makes non-deployable.
     * @param presetId Warper preset id.
     */
    function disablePreset(bytes32 presetId) external;

    /**
     * @dev Checks whether warper preset is enabled and available for deployment.
     * @param presetId Warper preset id.
     */
    function isPresetEnabled(bytes32 presetId) external returns (bool);

    /**
     * @dev Returns the list of all registered warper presets.
     */
    function getPresets() external returns (WarperPreset[] memory);

    /**
     * @dev Returns the warper preset details.
     * @param presetId Warper preset id.
     */
    function getPreset(bytes32 presetId) external returns (WarperPreset memory);

    /**
     * @dev Deploys a new warper from the preset identified by `presetId`.
     * @param presetId Warper preset id.
     * @param data Warper initialization data.
     * @return Deployed warper address.
     */
    function deployPreset(bytes32 presetId, bytes calldata data) external returns (address);
}
