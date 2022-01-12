// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IMetaHub {
    /**
     * @dev Emitted when a warper is deployed.
     */
    event WarperDeployed(address indexed original, address indexed warper);

    /**
     * @dev Deploys a preset warper identified by `presetId`.
     */
    function deployWarper(bytes32 presetId, address original) external returns (address);

    /**
     * @dev Returns warper preset factory address.
     */
    function getWarperPresetFactory() external view returns (address);
}
