// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../acl/AccessControlledUpgradeable.sol";
import "../Errors.sol";
import "./AssetClassRegistryStorage.sol";

contract AssetClassRegistry is
    IAssetClassRegistry,
    UUPSUpgradeable,
    AccessControlledUpgradeable,
    AssetClassRegistryStorage
{
    /**
     * @dev Modifier to make a function callable only for the registered asset class.
     */
    modifier onlyRegisteredAssetClass(bytes4 assetClass) {
        checkRegisteredAssetClass(assetClass);
        _;
    }

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

        _classes[assetClass] = config;
        emit AssetClassRegistered(assetClass, config.controller, config.vault);
    }

    /**
     * @inheritdoc IAssetClassRegistry
     */
    function setAssetClassVault(bytes4 assetClass, address vault)
        external
        onlyAdmin
        onlyRegisteredAssetClass(assetClass)
    {
        bytes4 vaultAssetClass = IAssetVault(vault).assetClass();
        if (vaultAssetClass != assetClass) revert AssetClassMismatch(vaultAssetClass, assetClass);

        _classes[assetClass].vault = vault;
        emit AssetClassVaultChanged(assetClass, vault);
    }

    /**
     * @inheritdoc IAssetClassRegistry
     */
    function setAssetClassController(bytes4 assetClass, address controller)
        external
        onlyAdmin
        onlyRegisteredAssetClass(assetClass)
    {
        bytes4 controllerAssetClass = IAssetController(controller).assetClass();
        if (controllerAssetClass != assetClass) revert AssetClassMismatch(controllerAssetClass, assetClass);

        _classes[assetClass].controller = controller;
        emit AssetClassControllerChanged(assetClass, controller);
    }

    /**
     * @inheritdoc IAssetClassRegistry
     */
    function assetClassConfig(bytes4 assetClass)
        external
        view
        onlyRegisteredAssetClass(assetClass)
        returns (ClassConfig memory)
    {
        return _classes[assetClass];
    }

    /**
     * @inheritdoc IAssetClassRegistry
     */
    function isRegisteredAssetClass(bytes4 assetClass) public view returns (bool) {
        // The registered asset must have controller.
        return address(_classes[assetClass].controller) != address(0);
    }

    /**
     * @inheritdoc IAssetClassRegistry
     */
    function checkRegisteredAssetClass(bytes4 assetClass) public view {
        if (!isRegisteredAssetClass(assetClass)) revert UnregisteredAssetClass(assetClass);
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
}
