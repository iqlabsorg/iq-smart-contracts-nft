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
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
import "../warper/IWarperController.sol";

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
 * @dev Thrown when the warper cannot be used for rending.
 */
error WarperIsDisabled();

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

/**
 * @dev Thrown when the original asset cannot be withdrawn because of active rentals
 * or other activity that requires asset to stay in the vault.
 */
error AssetIsLocked();

/**
 * @dev Thrown if warpers interface is not compatible with the AssetController.
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
        _checkListed(listingId);
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

    /** // todo: docs
     * @dev Metahub initializer.
     * @param warperPresetFactory Warper preset factory address.
     */
    function initialize(
        address warperPresetFactory,
        address universeToken,
        address acl,
        address baseToken,
        uint16 rentalFeePercent
    ) external initializer {
        __UUPSUpgradeable_init();

        // todo perform interface checks?
        _protocol = ProtocolConfig(
            IACL(acl),
            IWarperPresetFactory(warperPresetFactory),
            IUniverseToken(universeToken),
            IERC20(baseToken),
            rentalFeePercent
        );
    }

    /**
     * @inheritdoc IRentingManager
     */
    function estimateRentalFee(Rentings.Params calldata rentingParams)
        external
        view
        returns (
            uint256 listerBaseFee,
            uint256 listerPremium,
            uint256 universeBaseFee,
            uint256 universePremium,
            uint256 protocolFee,
            uint256 total
        )
    {
        // Check if asset listing is active.
        _checkListed(rentingParams.listingId);

        // Find selected listing.
        Listing storage listing = _listings[rentingParams.listingId];

        // Check whether listing is not paused.
        if (listing.paused) revert ListingIsPaused();

        // Find selected warper.
        Warper memory warper = _warpers[rentingParams.warper];

        // Check whether the warper is enabled.
        if (!warper.enabled) revert WarperIsDisabled();

        // Check if the renting request can be fulfilled by selected warper.
        Assets.Asset memory asset = listing.asset;
        warper.controller.validateRentingRequest(asset, rentingParams);

        // Resolve listing controller to calculate lister fee based on selected listing strategy.
        Listings.Params memory listingParams = listing.params;
        IListingController listingController = _listingStrategies[listingParams.strategy].controller;

        // Calculate base lister fee.
        listerBaseFee = listingController.calculateListerFee(listingParams, rentingParams);

        // Calculate universe fee.
        universeBaseFee = (listerBaseFee * _universes[warper.universeId].rentalFeePercent) / 10_000;

        // Calculate protocol fee.
        protocolFee = (listerBaseFee * _protocol.rentalFeePercent) / 10_000;

        // Calculate warper premiums.
        (universePremium, listerPremium) = warper.controller.calculatePremiums(
            asset,
            rentingParams,
            universeBaseFee,
            listerBaseFee
        );

        // Calculate TOTAL rental fee that will be paid by renter.
        total = listerBaseFee + listerPremium + universeBaseFee + universePremium + protocolFee;
    }

    /**
     * @inheritdoc IAssetClassManager
     */
    function registerAssetClass(bytes4 assetClass, AssetClassConfig calldata config) external onlyAdmin {
        if (_isRegisteredAssetClass(assetClass)) {
            revert AssetClassIsAlreadyRegistered(assetClass);
        }

        emit AssetClassRegistered(assetClass, address(config.controller), address(config.vault));
        _assetClasses[assetClass] = config;
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
        _assetClasses[assetClass].controller = controller;
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
        IUniverseToken universeToken = _protocol.universeToken;
        uint256 tokenId = universeToken.mint(_msgSender(), name);
        emit UniverseCreated(tokenId, universeToken.universeName(tokenId));

        return tokenId;
    }

    /**
     * @inheritdoc IUniverseManager
     */
    function universe(uint256 universeId)
        external
        returns (
            string memory name,
            string memory symbol,
            string memory universeName
        )
    {
        IUniverseToken universeToken = _protocol.universeToken;
        name = universeToken.name();
        symbol = universeToken.symbol();
        universeName = universeToken.universeName(universeId);
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
        _checkValidListingController(address(config.controller));
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
        _listingStrategies[strategyId].controller = IListingController(controller);
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
    function listAsset(
        Assets.Asset calldata asset,
        Listings.Params calldata params,
        uint32 maxLockPeriod
    ) external returns (uint256) {
        // Check that listing asset class is supported.
        _checkAssetClassSupport(asset.id.class);

        // Check that listing strategy is supported.
        _checkListingStrategySupport(params.strategy);

        // Extract token address from asset struct and check whether the asset is supported.
        address token = IAssetController(_assetClasses[asset.id.class].controller).getToken(asset);
        _checkAssetSupport(token);

        // Transfer asset to the vault. Asset transfer is performed via delegate call to the corresponding asset controller.
        // This approach allows to keep all token approvals on the Metahub account and utilize controller asset specific transfer logic.
        IAssetController controller = _assets[token].controller;
        IAssetVault vault = _assets[token].vault;
        address(controller).functionDelegateCall(
            abi.encodeWithSelector(IAssetController.transferAssetToVault.selector, asset, _msgSender(), address(vault))
        );

        // Generate new listing ID.
        _listingIdTracker.increment();
        uint256 listingId = _listingIdTracker.current();

        // Listing ID must be unique (this could throw only if listing ID tracker state is incorrect).
        assert(_listings[listingId].lister == address(0));

        // Store new listing record.
        Listing memory listing = Listing(_msgSender(), token, asset, params, maxLockPeriod, 0, false, false);
        _listings[listingId] = listing;

        emit AssetListed(listingId, listing.lister, listing.asset, listing.params, listing.maxLockPeriod);

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
        return address(_protocol.warperPresetFactory);
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
     * @inheritdoc IMetahub
     */
    function baseToken() external view returns (address) {
        return address(_protocol.baseToken);
    }

    /**
     * @inheritdoc AccessControlled
     */
    function _acl() internal view override returns (IACL) {
        return _protocol.acl;
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
        return _protocol.warperPresetFactory.deployPreset(presetId, initCall);
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

        IWarperController controller = IWarperController(_assetClasses[assetClass].controller);

        // Ensure warper compatibility with the current generation of asset controller.
        if (!controller.isCompatibleWarper(IWarper(warper))) {
            revert InvalidWarperInterface();
        }

        //todo: check warper count against limits to prevent uncapped enumeration.

        // Create warper main registration record.
        // Associate warper with the universe and current asset class controller,
        // to maintain backward compatibility in case of controller generation upgrade.
        // The warper is disabled by default.
        _warpers[warper] = Warper(universeId, controller, false);

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
        return IERC721Upgradeable(address(_protocol.universeToken)).ownerOf(universeId);
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
     * @dev Throws if listing is not registered or has been already delisted.
     * @param listingId Listing ID.
     */
    function _checkListed(uint256 listingId) internal view {
        if (!_isRegisteredListing(listingId) || _listings[listingId].delisted) {
            revert NotListed(listingId);
        }
    }

    /**
     * @dev Checks listing strategy registration by ID.
     * @param strategyId Listing strategy ID.
     */
    function _isRegisteredListingStrategy(bytes4 strategyId) internal view returns (bool) {
        return address(_listingStrategies[strategyId].controller) != address(0);
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
