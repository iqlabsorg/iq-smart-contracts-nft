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
import "../asset/IAssetController.sol";
import "../asset/IAssetVault.sol";
import "../warper/IWarper.sol";
import "../warper/ERC721/IERC721Warper.sol";
import "../warper/IWarperPreset.sol";
import "../warper/IWarperPresetFactory.sol";
import "../universe/IUniverseToken.sol";
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
 * @dev Thrown when the warper returned metahub address differs from the one it is being registered in.
 * @param actual Metahub address returned by warper.
 * @param required Required metahub address.
 */
error WarperHasIncorrectMetahubReference(address actual, address required);

/**
 * @dev Thrown when there is no controller registered for the provided asset class.
 */
error NoControllerForAssetClass(bytes4 assetClass);

/**
 * @dev Thrown when the is no vault registered for the provided asset class.
 */
error NoVaultForAssetClass(bytes4 assetClass);

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

// todo: docs, wording
error AssetIsRented();

contract Metahub is
    IMetahub,
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable, // todo: replace with custom implementation (2-step owner change)
    MetahubStorage
{
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
        if (_warpers[warper].universeId == 0) {
            revert WarperIsNotRegistered(warper);
        }
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
        if (_listings[listingId].lister == address(0) || _listings[listingId].delisted) {
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
    function initialize(address warperPresetFactory, address universeToken) external initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();

        _warperPresetFactory = IWarperPresetFactory(warperPresetFactory);
        _universeToken = IUniverseToken(universeToken);
    }

    /**
     * @inheritdoc IMetahub
     */
    function setAssetClassVault(bytes4 assetClass, address vault) external onlyOwner {
        bytes4 vaultAssetClass = IAssetVault(vault).assetClass();
        if (vaultAssetClass != assetClass) {
            revert AssetClassMismatch(vaultAssetClass, assetClass);
        }
        emit AssetClassVaultChanged(assetClass, address(_assetClassVaults[assetClass]), vault);
        _assetClassVaults[assetClass] = IAssetVault(vault);
    }

    /**
     * @inheritdoc IMetahub
     */
    function setAssetClassController(bytes4 assetClass, address controller) external onlyOwner {
        bytes4 controllerAssetClass = IAssetController(controller).assetClass();
        if (controllerAssetClass != assetClass) {
            revert AssetClassMismatch(controllerAssetClass, assetClass);
        }

        emit AssetClassControllerChanged(assetClass, address(_assetClassControllers[assetClass]), controller);
        _assetClassControllers[assetClass] = IAssetController(controller);
    }

    /**
     * @inheritdoc IMetahub
     */
    function removeAssetClassController(bytes4 assetClass) external onlyOwner {
        delete _assetClassControllers[assetClass];
        //todo: emit AssetClassControllerRemoved(assetClass, controller)
    }

    /**
     * @inheritdoc IMetahub
     */
    function assetClassController(bytes4 assetClass) external view returns (address) {
        return address(_assetClassControllers[assetClass]);
    }

    /**
     * @inheritdoc IMetahub
     */
    function createUniverse(string calldata name) external returns (uint256) {
        uint256 tokenId = _universeToken.mint(_msgSender(), name);
        emit UniverseCreated(tokenId, _universeToken.universeName(tokenId));

        return tokenId;
    }

    /**
     * @inheritdoc IMetahub
     */
    function deployWarper(
        uint256 universeId,
        address original,
        bytes32 presetId
    ) external onlyUniverseOwner(universeId) returns (address) {
        return _registerWarper(universeId, _deployWarperWithData(original, presetId, bytes("")));
    }

    /**
     * @inheritdoc IMetahub
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
    function listAsset(ListingParams calldata params) external returns (uint256) {
        // The asset must be supported by at least one warper.
        address token = _requireAssetClassController(params.asset.id.class).getToken(params.asset);
        if (_assetWarpers[token].length() == 0) {
            // todo: read asset config 'supported' flag
            revert UnsupportedAsset(token);
        }

        // Transfer asset to the vault. Asset transfer is performed via delegate call to the corresponding asset controller.
        // This approach allows to keep all token approvals on the Metahub account and utilize controller asset specific transfer logic.
        address controller = address(_assetVaults[token]);
        address vault = address(_assetVaults[token]);
        controller.functionDelegateCall(
            abi.encodeWithSelector(IAssetController.transferAssetToVault.selector, params.asset, _msgSender(), vault)
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
            params.maxLockPeriod,
            params.baseRate,
            0,
            false,
            false
        );
        _listings[listingId] = listing;

        emit AssetListed(listingId, listing.lister, listing.asset, listing.maxLockPeriod, listing.baseRate);

        return listingId;
    }

    /**
     * @inheritdoc IListingManager
     */
    function delistAsset(uint256 listingId) external whenListed(listingId) onlyLister(listingId) {
        Listing storage listing = _listings[listingId];
        listing.delisted = true;
        emit AssetDelisted(listingId, listing.lister, listing.unlocksAt);
    }

    /**
     * @inheritdoc IListingManager
     */
    function withdrawAsset(uint256 listingId) external onlyLister(listingId) {
        Listing memory listing = _listings[listingId];
        // Check whether the asset can be returned to the owner.
        if (block.timestamp < listing.unlocksAt) {
            revert AssetIsRented();
        }

        IAssetVault vault = _assetVaults[listing.token];
        IAssetController controller = _assetControllers[listing.token];

        // Delete listing record.
        delete _listings[listingId];

        // Transfer asset from the vault to the original owner.
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
        whenListingNotPaused(listingId)
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
     * @inheritdoc IMetahub
     */
    function warperPresetFactory() external view returns (address) {
        return address(_warperPresetFactory);
    }

    /**
     * @inheritdoc IMetahub
     */
    function universeWarpers(uint256 universeId) external view returns (address[] memory) {
        return _universeWarpers[universeId].values();
    }

    /**
     * @inheritdoc IMetahub
     */
    function assetWarpers(address original) external view returns (address[] memory) {
        return _assetWarpers[original].values();
    }

    /**
     * @inheritdoc IMetahub
     */
    function isWarperAdmin(address warper, address account) external view onlyRegisteredWarper(warper) returns (bool) {
        // Universe owner is the default admin for all presets.
        return _universeOwner(_warpers[warper].universeId) == account;
    }

    /**
     * @dev Checks whether the caller is authorized to upgrade the Metahub implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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
        // Check that warper is not already registered.
        if (_warpers[warper].universeId != 0) {
            revert WarperIsAlreadyRegistered(warper);
        }

        // Check that warper has correct metahub reference.
        address warperMetahub = IWarper(warper).__metahub();
        if (warperMetahub != address(this)) {
            revert WarperHasIncorrectMetahubReference(warperMetahub, address(this));
        }

        // Check that controller is registered for the warper asset class.
        bytes4 assetClass = IWarper(warper).__assetClass();
        IAssetController controller = _requireAssetClassController(assetClass);

        // todo: ensure warper compatibility with the current generation of asset controller.
        // controller.isCompatibleWarper(warper);
        //todo: check warper count against limits to prevent uncapped enumeration.

        IAssetVault vault = _requireAssetClassVault(assetClass);

        // Create warper main registration record.
        // Associate warper with the universe and current asset class controller,
        // to maintain backward compatibility in case of controller generation upgrade.
        // The warper is disabled by default.
        _warpers[warper] = Warper(false, universeId, controller);

        // Associate the warper with the universe.
        _universeWarpers[universeId].add(warper);

        // Associate the original asset with the the warper with.
        address original = IWarper(warper).__original();
        _assetWarpers[original].add(warper);

        // When the original asset is seen for the first time, associate it with the vault (based on class).
        if (address(_assetVaults[original]) == address(0)) {
            // todo: merge into structure?
            _assetVaults[original] = vault;
        }

        if (address(_assetControllers[original]) == address(0)) {
            // todo: merge into structure?
            _assetControllers[original] = controller;
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
     * @dev Returns controller address for specific asset class.
     * @param assetClass Asset class ID.
     */
    function _requireAssetClassController(bytes4 assetClass) internal view returns (IAssetController controller) {
        controller = _assetClassControllers[assetClass];
        if (address(controller) == address(0)) {
            revert NoControllerForAssetClass(assetClass);
        }
    }

    /**
     * @dev Returns vault address for specific asset class.
     * @param assetClass Asset class ID.
     */
    function _requireAssetClassVault(bytes4 assetClass) internal view returns (IAssetVault vault) {
        vault = _assetClassVaults[assetClass];
        if (address(vault) == address(0)) {
            revert NoVaultForAssetClass(assetClass);
        }
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
