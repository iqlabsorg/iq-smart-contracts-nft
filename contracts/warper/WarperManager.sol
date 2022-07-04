// SPDX-License-Identifier: MIT
// solhint-disable no-empty-blocks
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../acl/AccessControlledUpgradeable.sol";
import "./IWarperManager.sol";
import "./WarperManagerStorage.sol";

contract WarperManager is
    IWarperManager,
    Initializable,
    UUPSUpgradeable,
    AccessControlledUpgradeable,
    WarperManagerStorage
{
    using Warpers for Warpers.Registry;
    using Warpers for Warpers.Warper;
    using Assets for Assets.Asset;
    using Assets for Assets.Registry;

    /**
     * @dev Metahub initialization params.
     * @param warperPresetFactory Warper preset factory address.
     * @param assetClassRegistry
     * @param universeRegistry
     * @param acl
     */
    struct WareprManagerInitParams {
        IWarperPresetFactory warperPresetFactory;
        IAssetClassRegistry assetClassRegistry;
        IUniverseRegistry universeRegistry;
        IACL acl;
    }

    /**
     * @dev Modifier to make a function callable only by the warpers admin (universe owner).
     */
    modifier onlyWarperAdmin(address warper) {
        _checkWarperAdmin(warper, _msgSender());
        _;
    }

    /**
     * @dev Modifier to make sure that the warper has been registered beforehand.
     */
    modifier registeredWarper(address warper) {
        _warperRegistry.checkRegisteredWarper(warper);
        _;
    }

    /**
     * @dev Modifier to make a function callable only by the universe owner.
     */
    modifier onlyUniverseOwner(uint256 universeId) {
        _universeRegistry.checkUniverseOwner(universeId, _msgSender());
        _;
    }

    /**
     * @dev Metahub initializer.
     * @param params Initialization params.
     */
    function initialize(WareprManagerInitParams calldata params) external initializer {
        __UUPSUpgradeable_init();

        _aclContract = params.acl;

        _warperRegistry.presetFactory = params.warperPresetFactory;
        _assetRegistry.classRegistry = params.assetClassRegistry;
        _universeRegistry = params.universeRegistry;
    }

    /**
     * @inheritdoc IWarperManager
     */
    function registerWarper(address warper, WarperRegistrationParams calldata params)
        external
        onlyUniverseOwner(params.universeId)
    {
        (bytes4 assetClass, address original) = _warperRegistry.registerWarper(warper, params, _assetRegistry);

        // Register the original asset if it is seen for the first time.
        if (!_assetRegistry.isRegisteredAsset(original)) {
            _assetRegistry.registerAsset(assetClass, original);
        }

        emit WarperRegistered(params.universeId, warper, original, assetClass);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function deregisterWarper(address warper) external onlyWarperAdmin(warper) {
        _warperRegistry.remove(warper);
        emit WarperDeregistered(warper);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function pauseWarper(address warper) external onlyWarperAdmin(warper) {
        _warperRegistry.warpers[warper].pause();
        emit WarperPaused(warper);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function unpauseWarper(address warper) external onlyWarperAdmin(warper) {
        _warperRegistry.warpers[warper].unpause();
        emit WarperUnpaused(warper);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function setWarperController(address[] calldata warpers, address controller) external onlyAdmin {
        for (uint256 i = 0; i < warpers.length; i++) {
            address warper = warpers[i];
            _warperRegistry.checkRegisteredWarper(warper);
            IWarperController(controller).checkCompatibleWarper(warper);
            _warperRegistry.warpers[warper].controller = IWarperController(controller);
        }
    }

    /**
     * @inheritdoc IWarperManager
     */
    function warperPresetFactory() external view returns (address) {
        return address(_warperRegistry.presetFactory);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function universeWarperCount(uint256 universeId) external view returns (uint256) {
        return _warperRegistry.universeWarperCount(universeId);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function universeWarpers(
        uint256 universeId,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory, Warpers.Warper[] memory) {
        return _warperRegistry.universeWarpers(universeId, offset, limit);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function assetWarperCount(address original) external view returns (uint256) {
        return _warperRegistry.assetWarperCount(original);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function assetWarpers(
        address original,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory, Warpers.Warper[] memory) {
        return _warperRegistry.assetWarpers(original, offset, limit);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function supportedAssetCount() external view returns (uint256) {
        return _assetRegistry.assetCount();
    }

    /**
     * @inheritdoc IWarperManager
     */
    function supportedAssets(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory, Assets.AssetConfig[] memory)
    {
        return _assetRegistry.supportedAssets(offset, limit);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function isWarperAdmin(address warper, address account) external view registeredWarper(warper) returns (bool) {
        return _universeRegistry.isUniverseOwner(_warperRegistry.warpers[warper].universeId, account);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function warperInfo(address warper) external view registeredWarper(warper) returns (Warpers.Warper memory) {
        return _warperRegistry.warpers[warper];
    }

    /**
     * @inheritdoc IWarperManager
     */
    function warperController(address warper) external view registeredWarper(warper) returns (address) {
        return address(_warperRegistry.warpers[warper].controller);
    }

    /**
     * @inheritdoc UUPSUpgradeable
     * @dev Checks whether the caller is authorized to upgrade the Metahub implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Reverts if the warpers universe owner is not the provided account address.
     * @param warper Warpers address.
     * @param account The address that's expected to be the warpers universe owner.
     */
    function _checkWarperAdmin(address warper, address account) internal view {
        _universeRegistry.checkUniverseOwner(_warperRegistry.warpers[warper].universeId, account);
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }
}
