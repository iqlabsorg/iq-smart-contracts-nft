// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
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
error AssetHasNoWarpers(address asset);

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
        emit AssetClassVaultChanged(assetClass, _assetClassVaults[assetClass], vault);
        _assetClassVaults[assetClass] = vault;
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
        //todo: event
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
     * @inheritdoc IAssetListingController
     */
    function listAsset(ListingParams calldata params) external {
        // todo: validate listing request
        // Provided asset must have at least one associated warper.
        //        if (_assetWarpers[params.asset].length() == 0) {
        //            revert AssetHasNoWarpers(params.asset);
        //        }

        address controller = address(_assetClassControllers[params.asset.id.class]);
        address vault = _assetClassVaults[params.asset.id.class];

        bytes memory transfer = abi.encodeWithSelector(
            IAssetController.transfer.selector,
            params.asset,
            _msgSender(),
            address(vault),
            bytes("")
        );
        controller.functionDelegateCall(transfer);
        // todo: register
        //        emit AssetListed(params.asset);
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
        IAssetController controller = _assetClassControllers[assetClass];
        if (address(controller) == address(0)) {
            revert NoControllerForAssetClass(assetClass);
        }

        // Check that asset vault is registered for the original asset class (same as warper).
        address vault = _assetClassVaults[assetClass];
        if (vault == address(0)) {
            revert NoVaultForAssetClass(assetClass);
        }

        // todo: ensure warper compatibility with the current generation of asset controller.
        // controller.isCompatibleWarper(warper);
        //todo: check warper count against limits to prevent uncapped enumeration.

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

        // When original asset is seen for the first time, associate it with the vault (based on class).
        if (_assetVaults[original] == address(0)) {
            _assetVaults[original] = _assetClassVaults[assetClass];
        }

        emit WarperRegistered(universeId, original, warper);

        return warper;
    }

    function _universeOwner(uint256 universeId) internal view returns (address) {
        return IERC721Upgradeable(address(_universeToken)).ownerOf(universeId);
    }
}
