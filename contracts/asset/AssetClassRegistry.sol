// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import "../acl/AccessControlledUpgradeable.sol";
import "./AssetClassRegistryStorage.sol";

contract AssetClassRegistry is
    IAssetClassRegistry,
    UUPSUpgradeable,
    AccessControlledUpgradeable,
    AssetClassRegistryStorage
{
    using ERC165CheckerUpgradeable for address;

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
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

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
        _checkValidAssetController(assetClass, config.controller);
        _checkValidAssetVault(assetClass, config.vault);

        // Check if not already registered.
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
        _checkValidAssetVault(assetClass, vault);
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
        _checkValidAssetController(assetClass, controller);
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
     * @inheritdoc UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Reverts if provided address is not a valid asset controller address.
     * @param assetClass Asset class ID.
     * @param controller Asset controller address.
     */
    function _checkValidAssetController(bytes4 assetClass, address controller) internal view {
        if (!controller.supportsInterface(type(IAssetController).interfaceId)) revert InvalidAssetControllerInterface();
        bytes4 contractAssetClass = IAssetController(controller).assetClass();
        if (contractAssetClass != assetClass) revert AssetClassMismatch(contractAssetClass, assetClass);
    }

    /**
     * @dev Reverts if provided address is not a valid asset vault address.
     * @param assetClass Asset class ID.
     * @param vault Asset vault address.
     */
    function _checkValidAssetVault(bytes4 assetClass, address vault) internal view {
        if (!vault.supportsInterface(type(IAssetVault).interfaceId)) revert InvalidAssetVaultInterface();
        bytes4 contractAssetClass = IAssetVault(vault).assetClass();
        if (contractAssetClass != assetClass) revert AssetClassMismatch(contractAssetClass, assetClass);
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }
}
