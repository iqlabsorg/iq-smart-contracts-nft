// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./IAssetClassRegistry.sol";
import "../acl/AccessControlledUpgradeable.sol";

contract AssetClassRegistry is IAssetClassRegistry, UUPSUpgradeable, AccessControlledUpgradeable {
    /**
     * @dev ACL contract.
     */
    IACL private _aclContract;

    /**
     * @dev Mapping from asset class ID to the asset class configuration.
     */
    mapping(bytes4 => ClassConfig) private _registry;

    /**
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {}

    /**
     * @dev AssetClassRegistry initializer.
     * @param acl ACL contract address.
     */
    function initialize(address acl) external initializer {
        __UUPSUpgradeable_init();
        _aclContract = IACL(acl);
    }

    /**
     * @inheritdoc IAssetClassRegistry
     */
    function registerAssetClass(bytes4 assetClass, ClassConfig calldata config) external onlyAdmin {
        //todo: validate interfaces
        if (isRegisteredAssetClass(assetClass)) revert AssetClassIsAlreadyRegistered(assetClass);

        _registry[assetClass] = config;
        emit AssetClassRegistered(assetClass, config.controller, config.vault);
    }

    /**
     * @inheritdoc IAssetClassRegistry
     */
    function setAssetClassVault(bytes4 assetClass, address vault) external onlyAdmin {
        bytes4 vaultAssetClass = IAssetVault(vault).assetClass();
        if (vaultAssetClass != assetClass) revert AssetClassMismatch(vaultAssetClass, assetClass);

        _registry[assetClass].vault = vault;
        emit AssetClassVaultChanged(assetClass, vault);
    }

    /**
     * @inheritdoc IAssetClassRegistry
     */
    function setAssetClassController(bytes4 assetClass, address controller) external onlyAdmin {
        bytes4 controllerAssetClass = IAssetController(controller).assetClass();
        if (controllerAssetClass != assetClass) revert AssetClassMismatch(controllerAssetClass, assetClass);

        _registry[assetClass].controller = controller;
        emit AssetClassControllerChanged(assetClass, controller);
    }

    /**
     * @inheritdoc IAssetClassRegistry
     */
    function assetClassConfig(bytes4 assetClass) external view returns (ClassConfig memory) {
        return _registry[assetClass];
    }

    /**
     * @dev Checks asset class support.
     * @param assetClass Asset class ID.
     */
    function isRegisteredAssetClass(bytes4 assetClass) public view returns (bool) {
        // The registered asset must have controller.
        return address(_registry[assetClass].controller) != address(0);
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
}