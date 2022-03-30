// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../asset/IAssetController.sol";
import "./Warpers.sol";

interface IWarperManager {
    /**
     * @dev Thrown when the warper returned metahub address differs from the one it is being registered in.
     * @param actual Metahub address returned by warper.
     * @param required Required metahub address.
     */
    error WarperHasIncorrectMetahubReference(address actual, address required);

    /**
     * @dev Emitted when a new warper is registered.
     * @param universeId Universe ID.
     * @param warper Warper address.
     * @param original Original asset address.
     */
    event WarperRegistered(uint256 indexed universeId, address indexed warper, address indexed original);

    /**
     * @dev Emitted when the warper is paused.
     * @param warper Address.
     */
    event WarperPaused(address indexed warper);

    /**
     * @dev Emitted when the warper pause is lifted.
     * @param warper Address.
     */
    event WarperUnpaused(address indexed warper);

    /**
     * @dev Deploys a preset warper identified by `presetId`.
     * @param universeId Universe ID.
     * @param original Original asset contract address.
     * @param presetId Warper preset ID.
     * @return Warper address.
     */
    function deployWarper(
        uint256 universeId,
        address original,
        bytes32 presetId
    ) external returns (address);

    /**
     * @dev Deploys a preset warper identified by `presetId`, and performs additional setup call.
     * @param universeId Universe ID.
     * @param original Original asset contract address.
     * @param presetId Warper preset ID.
     * @param presetData Warper additional initialization data.
     * @return Warper address.
     */
    function deployWarperWithData(
        uint256 universeId,
        address original,
        bytes32 presetId,
        bytes calldata presetData
    ) external returns (address);

    /**
     * @dev Registers a new custom warper.
     * The warper must be deployed and configured prior to registration,
     * since it becomes available for renting immediately.
     * @param universeId Universe ID.
     * @param warper Warper address.
     */
    function registerWarper(address warper, uint256 universeId) external;

    /**
     * @dev Returns the list of warpers belonging to the particular universe.
     * @param universeId The universe ID.
     * @return List of warper addresses.
     */
    function universeWarpers(uint256 universeId) external view returns (address[] memory);

    /**
     * @dev Returns the list of warpers associated wit the particular original asset.
     * @param original Original asset address.
     * @return List of warper addresses.
     */
    function assetWarpers(address original) external view returns (address[] memory);

    /**
     * @dev Returns warper preset factory address.
     */
    function warperPresetFactory() external view returns (address);

    /**
     * @dev Checks whether `account` is the `warper` admin.
     * @param warper Warper address.
     * @param account Account address.
     * @return True if the `account` is the admin of the `warper` and false otherwise.
     */
    function isWarperAdmin(address warper, address account) external view returns (bool);

    /**
     * @dev Returns registered warper details.
     * @param warperInfo Warper address.
     * @return Warper details.
     */
    function warperInfo(address warperInfo) external view returns (Warpers.Warper memory);

    /**
     * @dev Returns warper controller address.
     * @param warper Warper address.
     * @return Current controller.
     */
    function warperController(address warper) external view returns (address);

    /**
     * @dev Puts the warper on pause.
     * Emits a {WarperPaused} event.
     * @param warper Address.
     */
    function pauseWarper(address warper) external;

    /**
     * @dev Lifts the warper pause.
     * Emits a {WarperUnpaused} event.
     * @param warper Address.
     */
    function unpauseWarper(address warper) external;
}
