// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../asset/IAssetController.sol";
import "./Warpers.sol";

interface IWarperManager {
    /**
     * @dev Warper registration params.
     * @param name The warper name.
     * @param universeId The universe ID.
     * @param paused Indicates whether the warper should stay paused after registration.
     */
    struct WarperRegistrationParams {
        string name;
        uint256 universeId;
        bool paused;
    }

    /**
     * @dev Emitted when a new warper is registered.
     * @param universeId Universe ID.
     * @param warper Warper address.
     * @param original Original asset address.
     * @param assetClass Asset class ID (identical for the `original` and `warper`).
     */
    event WarperRegistered(
        uint256 indexed universeId,
        address indexed warper,
        address indexed original,
        bytes4 assetClass
    );

    /**
     * @dev Emitted when the warper is no longer registered.
     * @param warper Warper address.
     */
    event WarperDeregistered(address indexed warper);

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
     * @dev Registers a new warper.
     * The warper must be deployed and configured prior to registration,
     * since it becomes available for renting immediately.
     * @param warper Warper address.
     * @param params Warper registration params.
     */
    function registerWarper(address warper, WarperRegistrationParams calldata params) external;

    /**
     * @dev Deletes warper registration information.
     * All current rental agreements with the warper will stay intact, but the new rentals won't be possible.
     * @param warper Warper address.
     */
    function deregisterWarper(address warper) external;

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

    /**
     * @dev Returns the number of warpers belonging to the particular universe.
     * @param universeId The universe ID.
     * @return Warper count.
     */
    function universeWarperCount(uint256 universeId) external view returns (uint256);

    /**
     * @dev Returns the list of warpers belonging to the particular universe.
     * @param universeId The universe ID.
     * @param offset Starting index.
     * @param limit Max number of items.
     * @return List of warper addresses.
     * @return List of warpers.
     */
    function universeWarpers(
        uint256 universeId,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory, Warpers.Warper[] memory);

    /**
     * @dev Returns the number of warpers associated with the particular original asset.
     * @param original Original asset address.
     * @return Warper count.
     */
    function assetWarperCount(address original) external view returns (uint256);

    /**
     * @dev Returns the list of warpers associated with the particular original asset.
     * @param original Original asset address.
     * @param offset Starting index.
     * @param limit Max number of items.
     * @return List of warper addresses.
     * @return List of warpers.
     */
    function assetWarpers(
        address original,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory, Warpers.Warper[] memory);

    /**
     * @dev Returns the number of currently supported assets.
     * @return Asset count.
     */
    function supportedAssetCount() external view returns (uint256);

    /**
     * @dev Returns the list of all supported asset addresses.
     * @param offset Starting index.
     * @param limit Max number of items.
     * @return List of original asset addresses.
     * @return List of asset config structures.
     */
    function supportedAssets(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory, Assets.AssetConfig[] memory);

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
     * @param warper Warper address.
     * @return Warper details.
     */
    function warperInfo(address warper) external view returns (Warpers.Warper memory);

    /**
     * @dev Returns warper controller address.
     * @param warper Warper address.
     * @return Current controller.
     */
    function warperController(address warper) external view returns (address);
}
