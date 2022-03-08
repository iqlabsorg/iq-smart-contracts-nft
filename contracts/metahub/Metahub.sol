// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../acl/AccessControlled.sol";
import "../asset/IAssetController.sol";
import "../asset/IAssetVault.sol";
import "../warper/IWarper.sol";
import "../warper/ERC721/IERC721Warper.sol";
import "../warper/IWarperPreset.sol";
import "../warper/IWarperPresetFactory.sol";
import "../universe/IUniverseToken.sol";
import "../listing/IListingController.sol";
import "../Errors.sol";
import "./IMetahub.sol";
import "./MetahubStorage.sol";

/**
 * @dev Thrown when the message sender doesn't match the universe owner.
 */
error CallerIsNotUniverseOwner();

/**
 * @dev Thrown when performing action or accessing data of an unknown warper.
 * @param warper Warper address.
 */
error WarperIsNotRegistered(address warper);

/**
 * @dev Thrown upon attempting to register a warper twice.
 * @param warper Duplicate warper address.
 */
error WarperIsAlreadyRegistered(address warper);

/**
 * @dev Thrown when there are no registered warpers for a particular asset.
 * @param asset Asset address.
 */
error UnsupportedAsset(address asset);

/**
 * @dev Thrown when the asset class is not registered or deprecated.
 * @param assetClass Asset class ID.
 */
error UnsupportedAssetClass(bytes4 assetClass);

/**
 * @dev Thrown when the warper returned metahub address differs from the one it is being registered in.
 * @param actual Metahub address returned by warper.
 * @param required Required metahub address.
 */
error WarperHasIncorrectMetahubReference(address actual, address required);

/**
 * @dev Thrown when the `listingId` is invalid or the asset has been delisted.
 */
error NotListed(uint256 listingId);

/**
 * @dev Thrown when the message sender doesn't match the asset lister address.
 */
error CallerIsNotAssetLister();

/**
 * @dev Thrown when the operation is not allowed due to the listing being paused.
 */
error ListingIsPaused();

/**
 * @dev Thrown when the operation is not allowed due to the listing not being paused.
 */
error ListingIsNotPaused();

/**
 * @dev Thrown upon attempting to register an asset class twice.
 * @param assetClass Duplicate asset class ID.
 */
error AssetClassIsAlreadyRegistered(bytes4 assetClass);

// todo: docs, wording
error AssetIsLocked();

/**
 * @dev Thrown if warpers interface is not compatible with the AssetController
 */
error InvalidWarperInterface();

/**
 * @dev Thrown upon attempting to register a listing strategy twice.
 * @param strategyId Duplicate listing strategy ID.
 */
error ListingStrategyIsAlreadyRegistered(bytes4 strategyId);

/**
 * @dev Thrown when listing controller is dos not implement the required interface.
 */
error InvalidListingControllerInterface();

/**
 * @dev Thrown when the listing strategy is not registered or deprecated.
 * @param strategyId Unsupported listing strategy ID.
 */
error UnsupportedListingStrategy(bytes4 strategyId);

contract Metahub is IMetahub, Initializable, UUPSUpgradeable, AccessControlled, MetahubStorage {
    using Address for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using Assets for Assets.Asset;

    /**
     * @dev Modifier to make a function callable only by the universe owner.
     */
    modifier onlyUniverseOwner(uint256 universeId) {
        if (_msgSender() != _universeOwner(universeId)) {
            revert CallerIsNotUniverseOwner();
        }
        _;
    }

    /**
     * @dev Modifier to make sure the function is called for registered warper.
     */
    modifier onlyRegisteredWarper(address warper) {
        _checkRegisteredWarper(warper);
        _;
    }

    /**
     * @dev Modifier to make a function callable only by the asset lister (original owner).
     */
    modifier onlyLister(uint256 listingId) {
        if (_msgSender() != _listings[listingId].lister) {
            revert CallerIsNotAssetLister();
        }
        _;
    }

    /**
     * @dev Modifier to make sure the function is called for the listed asset.
     */
    modifier whenListed(uint256 listingId) {
        if (!_isRegisteredListing(listingId) || _listings[listingId].delisted) {
            revert NotListed(listingId);
        }
        _;
    }

    /**
     * @dev Modifier to make sure the function is called only when the listing is paused.
     */
    modifier whenListingPaused(uint256 listingId) {
        if (!_listings[listingId].paused) {
            revert ListingIsNotPaused();
        }
        _;
    }

    /**
     * @dev Modifier to make sure the function is called only when the listing is not paused.
     */
    modifier whenListingNotPaused(uint256 listingId) {
        if (_listings[listingId].paused) {
            revert ListingIsPaused();
        }
        _;
    }

    /**
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {}

    /**
     * @dev Metahub initializer.
     * @param warperPresetFactory Warper preset factory address.
     */
    function initialize(
        address warperPresetFactory,
        address universeToken,
        address acl
    ) external initializer {
        __UUPSUpgradeable_init();

        // todo perform interface checks?
        _warperPresetFactory = IWarperPresetFactory(warperPresetFactory);
        _universeToken = IUniverseToken(universeToken);
        _aclContract = IACL(acl);
    }

    /**
     * @inheritdoc IAssetClassManager
     */
    function registerAssetClass(bytes4 assetClass, AssetClassConfig calldata config) external onlyAdmin {
        if (_isRegisteredAssetClass(assetClass)) {
            revert AssetClassIsAlreadyRegistered(assetClass);
        }
        _assetClasses[assetClass] = config;
        //todo: emit AssetClassRegistered
    }

    /**
     * @inheritdoc IAssetClassManager
     */
    function setAssetClassVault(bytes4 assetClass, address vault) external onlyAdmin {
        bytes4 vaultAssetClass = IAssetVault(vault).assetClass();
        if (vaultAssetClass != assetClass) {
            revert AssetClassMismatch(vaultAssetClass, assetClass);
        }
        emit AssetClassVaultChanged(assetClass, address(_assetClasses[assetClass].vault), vault);
        _assetClasses[assetClass].vault = IAssetVault(vault);
    }

    /**
     * @inheritdoc IAssetClassManager
     */
    function setAssetClassController(bytes4 assetClass, address controller) external onlyAdmin {
        bytes4 controllerAssetClass = IAssetController(controller).assetClass();
        if (controllerAssetClass != assetClass) {
            revert AssetClassMismatch(controllerAssetClass, assetClass);
        }

        emit AssetClassControllerChanged(assetClass, address(_assetClasses[assetClass].controller), controller);
        _assetClasses[assetClass].controller = IAssetController(controller);
    }

    /**
     * @inheritdoc IAssetClassManager
     */
    function assetClassConfig(bytes4 assetClass) external view returns (AssetClassConfig memory) {
        return _assetClasses[assetClass];
    }

    /**
     * @inheritdoc IUniverseManager
     */
    function createUniverse(string calldata name) external returns (uint256) {
        uint256 tokenId = _universeToken.mint(_msgSender(), name);
        emit UniverseCreated(tokenId, _universeToken.universeName(tokenId));

        return tokenId;
    }

    /**
     * @inheritdoc IWarperManager
     */
    function deployWarper(
        uint256 universeId,
        address original,
        bytes32 presetId
    ) external onlyUniverseOwner(universeId) returns (address) {
        return _registerWarper(universeId, _deployWarperWithData(original, presetId, bytes("")));
    }

    /**
     * @inheritdoc IWarperManager
     */
    function deployWarperWithData(
        uint256 universeId,
        address original,
        bytes32 presetId,
        bytes calldata presetData
    ) external onlyUniverseOwner(universeId) returns (address) {
        if (presetData.length == 0) {
            revert EmptyPresetData();
        }
        return _registerWarper(universeId, _deployWarperWithData(original, presetId, presetData));
    }

    /**
     * @inheritdoc IListingManager
     */
    function registerListingStrategy(bytes4 strategyId, ListingStrategyConfig calldata config) external onlyAdmin {
        _checkValidListingController(config.controller);
        if (_isRegisteredListingStrategy(strategyId)) {
            revert ListingStrategyIsAlreadyRegistered(strategyId);
        }

        _listingStrategies[strategyId] = config;
        //todo: event
    }

    /**
     * @inheritdoc IListingManager
     */
    function setListingController(bytes4 strategyId, address controller) external onlySupervisor {
        _checkValidListingController(controller);
        _listingStrategies[strategyId].controller = controller;
        //todo: event
    }

    /**
     * @inheritdoc IListingManager
     */
    function listingStrategy(bytes4 strategyId) external view returns (ListingStrategyConfig memory) {
        _checkListingStrategySupport(strategyId);
        return _listingStrategies[strategyId];
    }

    /**
     * @inheritdoc IListingManager
     */
    function listAsset(ListingParams calldata params) external returns (uint256) {
        // Check that listing asset class is supported.
        _checkAssetClassSupport(params.asset.id.class);

        // Check that listing strategy is supported.
        _checkListingStrategySupport(params.strategy.id);

        // Extract token address from asset struct and check whether the asset is supported.
        address token = _assetClasses[params.asset.id.class].controller.getToken(params.asset);
        _checkAssetSupport(token);

        // Transfer asset to the vault. Asset transfer is performed via delegate call to the corresponding asset controller.
        // This approach allows to keep all token approvals on the Metahub account and utilize controller asset specific transfer logic.
        IAssetController controller = _assets[token].controller;
        IAssetVault vault = _assets[token].vault;
        address(controller).functionDelegateCall(
            abi.encodeWithSelector(
                IAssetController.transferAssetToVault.selector,
                params.asset,
                _msgSender(),
                address(vault)
            )
        );

        // Generate new listing ID.
        _listingIdTracker.increment();
        uint256 listingId = _listingIdTracker.current();

        // Listing ID must be unique (this could throw only if listing ID tracker state is incorrect).
        assert(_listings[listingId].lister == address(0));

        // Store new listing record.
        Listing memory listing = Listing(
            _msgSender(),
            token,
            params.asset,
            params.strategy,
            params.maxLockPeriod,
            0,
            false,
            false
        );
        _listings[listingId] = listing;

        emit AssetListed(listingId, listing.lister, listing.asset, listing.strategy, listing.maxLockPeriod);

        return listingId;
    }

    /**
     * @inheritdoc IListingManager
     */
    function delistAsset(uint256 listingId) external whenListed(listingId) onlyLister(listingId) {
        Listing storage listing = _listings[listingId];
        listing.delisted = true;
        emit AssetDelisted(listingId, listing.lister, listing.lockedTill);
    }

    /**
     * @inheritdoc IListingManager
     */
    function withdrawAsset(uint256 listingId) external onlyLister(listingId) {
        Listing memory listing = _listings[listingId];
        // Check whether the asset can be returned to the owner.
        if (block.timestamp < listing.lockedTill) {
            revert AssetIsLocked();
        }

        // Delete listing record.
        delete _listings[listingId];

        // Transfer asset from the vault to the original owner.
        IAssetController controller = _assets[listing.token].controller;
        IAssetVault vault = _assets[listing.token].vault;
        address(controller).functionDelegateCall(
            abi.encodeWithSelector(IAssetController.returnAssetFromVault.selector, listing.asset, address(vault))
        );

        emit AssetWithdrawn(listingId, listing.lister, listing.asset);
    }

    /**
     * @inheritdoc IListingManager
     */
    function pauseListing(uint256 listingId)
        external
        whenListed(listingId)
        onlyLister(listingId)
        whenListingNotPaused(listingId)
    {
        _listings[listingId].paused = true;
        emit ListingPaused(listingId);
    }

    /**
     * @inheritdoc IListingManager
     */
    function unpauseListing(uint256 listingId)
        external
        whenListed(listingId)
        onlyLister(listingId)
        whenListingPaused(listingId)
    {
        _listings[listingId].paused = false;
        emit ListingUnpaused(listingId);
    }

    /**
     * @inheritdoc IListingManager
     */
    function listing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    /**
     * @inheritdoc IWarperManager
     */
    function warperPresetFactory() external view returns (address) {
        return address(_warperPresetFactory);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function universeWarpers(uint256 universeId) external view returns (address[] memory) {
        return _universes[universeId].warpers.values();
    }

    /**
     * @inheritdoc IWarperManager
     */
    function assetWarpers(address original) external view returns (address[] memory) {
        return _assets[original].warpers.values();
    }

    /**
     * @inheritdoc IWarperManager
     */
    function isWarperAdmin(address warper, address account) external view onlyRegisteredWarper(warper) returns (bool) {
        // Universe owner is the default admin for all presets.
        return _universeOwner(_warpers[warper].universeId) == account;
    }

    /**
     * @inheritdoc IWarperManager
     */
    function warper(address warper) external view onlyRegisteredWarper(warper) returns (Warper memory) {
        return _warpers[warper];
    }

    /**
     * @inheritdoc AccessControlled
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }

    /**
     * @dev Checks whether the caller is authorized to upgrade the Metahub implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    /**
     * @dev Constructs warper initialization payload and
     * calls warper preset factory to deploy a warper from preset.
     */
    function _deployWarperWithData(
        address original,
        bytes32 presetId,
        bytes memory presetData
    ) internal returns (address) {
        // Construct warper initialization payload call.
        // Put warper default initialization payload first, then append additional preset data.
        bytes memory initCall = abi.encodeWithSelector(
            IWarperPreset.__initialize.selector,
            abi.encode(original, address(this), presetData)
        );

        // Deploy new warper instance from preset via warper preset factory.
        return _warperPresetFactory.deployPreset(presetId, initCall);
    }

    /**
     * @dev Performs warper registration.
     * @param universeId The universe ID.
     * @param warper The warper address.
     */
    function _registerWarper(uint256 universeId, address warper) internal returns (address) {
        // Check that warper asset class is supported.
        bytes4 assetClass = IWarper(warper).__assetClass();
        _checkAssetClassSupport(assetClass);

        // Check that warper is not already registered.
        if (_isRegisteredWarper(warper)) {
            revert WarperIsAlreadyRegistered(warper);
        }

        // Check that warper has correct metahub reference.
        address warperMetahub = IWarper(warper).__metahub();
        if (warperMetahub != address(this)) {
            revert WarperHasIncorrectMetahubReference(warperMetahub, address(this));
        }

        IAssetController controller = _assetClasses[assetClass].controller;

        // Ensure warper compatibility with the current generation of asset controller.
        if (!controller.isCompatibleWarper(IWarper(warper))) {
            revert InvalidWarperInterface();
        }

        //todo: check warper count against limits to prevent uncapped enumeration.

        // Create warper main registration record.
        // Associate warper with the universe and current asset class controller,
        // to maintain backward compatibility in case of controller generation upgrade.
        // The warper is disabled by default.
        _warpers[warper] = Warper(false, universeId, controller);

        // Associate the warper with the universe.
        _universes[universeId].warpers.add(warper);

        // Associate the original asset with the the warper with.
        address original = IWarper(warper).__original();
        _assets[original].warpers.add(warper);

        // Register the original asset if it is seen for the first time.
        if (!_isRegisteredAsset(original)) {
            _registerAsset(original, _assetClasses[assetClass].vault, controller);
        }

        emit WarperRegistered(universeId, original, warper);

        return warper;
    }

    /**
     * @dev Returns Universe NFT owner.
     * @param universeId Universe ID.
     * @return Universe owner.
     */
    function _universeOwner(uint256 universeId) internal view returns (address) {
        return IERC721Upgradeable(address(_universeToken)).ownerOf(universeId);
    }

    /**
     * @dev Checks asset support by address.
     * @param asset Asset address.
     */
    function _isSupportedAsset(address asset) internal view returns (bool) {
        // The supported asset should have at least one warper.
        return _assets[asset].warpers.length() > 0;
    }

    /**
     * @dev Throws if asset is not supported.
     * @param asset Asset address.
     */
    function _checkAssetSupport(address asset) internal view {
        if (!_isSupportedAsset(asset)) revert UnsupportedAsset(asset);
    }

    /**
     * @dev Checks asset registration by address.
     * @param asset Asset address.
     */
    function _isRegisteredAsset(address asset) internal view returns (bool) {
        // The registered asset must have controller.
        return address(_assets[asset].controller) != address(0);
    }

    /**
     * @dev Checks listing registration by ID.
     * @param listingId Listing ID.
     */
    function _isRegisteredListing(uint256 listingId) internal view returns (bool) {
        return _listings[listingId].lister != address(0);
    }

    /**
     * @dev Checks warper registration by address.
     * @param warper Warper address.
     */
    function _isRegisteredWarper(address warper) internal view returns (bool) {
        return _warpers[warper].universeId != 0;
    }

    /**
     * @dev Registers new asset.
     * @param asset Asset address.
     * @param vault Asset vault.
     * @param controller Asset controller.
     */
    function _registerAsset(
        address asset,
        IAssetVault vault,
        IAssetController controller
    ) internal {
        _assets[asset].vault = vault;
        _assets[asset].controller = controller;
        // todo: emit event AssetRegistered(asset);
    }

    /**
     * @dev Checks asset class support.
     * @param assetClass Asset class ID.
     */
    function _isRegisteredAssetClass(bytes4 assetClass) internal view returns (bool) {
        // The registered asset must have controller.
        return address(_assetClasses[assetClass].controller) != address(0);
    }

    /**
     * @dev Throws if asset class is not supported.
     * @param assetClass Asset class ID.
     */
    function _checkAssetClassSupport(bytes4 assetClass) internal view {
        if (!_isRegisteredAssetClass(assetClass)) revert UnsupportedAssetClass(assetClass);
    }

    /**
     * @dev Throws if listing strategy is not supported.
     * @param strategyId Listing strategy ID.
     */
    function _checkListingStrategySupport(bytes4 strategyId) internal view {
        if (!_isRegisteredListingStrategy(strategyId)) revert UnsupportedListingStrategy(strategyId);
    }

    /**
     * @dev Throws if warper is not registered.
     * @param warper Warper address.
     */
    function _checkRegisteredWarper(address warper) internal view {
        if (!_isRegisteredWarper(warper)) revert WarperIsNotRegistered(warper);
    }

    /**
     * @dev Throws if provided address is not a valid listing controller.
     * @param controller Listing controller address.
     */
    function _checkValidListingController(address controller) internal view {
        if (!controller.supportsInterface(type(IListingController).interfaceId)) {
            revert InvalidListingControllerInterface();
        }
    }

    /**
     * @dev Checks listing strategy registration by ID.
     * @param strategyId Listing strategy ID.
     */
    function _isRegisteredListingStrategy(bytes4 strategyId) internal view returns (bool) {
        return _listingStrategies[strategyId].controller != address(0);
    }

    //todo implement the real implementation here
    function getActiveWarperRentalCount(address warper, address account) external view returns (uint256) {
        return 0;
    }

    //todo implement the real implementation here
    function getWarperRentalStatus(address warper, uint256 tokenId) external view returns (WarperRentalStatus) {
        return WarperRentalStatus.RENTED;
    }
}
