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
 * @dev Thrown when there are no registered warpers for a particular asset.
 * @param asset Asset address.
 */
error AssetHasNoWarpers(address asset);

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
        // todo: validate vault class
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
        // todo: put asset into custody
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

    function _registerWarper(uint256 universeId, address warper) internal returns (address) {
        //todo: check if asset controller is registered for this warper asset class (Does this affect presets?).
        //todo: assert correct initialization? _verifyWarper()
        //todo: check if warper is not already registered!
        //todo: check warper count against limits to prevent uncapped enumeration.
        //todo: associate current asset class controller with warper
        //todo: associate current asset class vault with original address

        address original = IWarper(warper).__original();

        // Create warper main registration record.
        _warpers[warper] = Warper(universeId, false);

        // Associate the warper with the universe.
        _universeWarpers[universeId].add(warper);

        // Associate the warper with the original asset.
        _assetWarpers[original].add(warper);

        emit WarperRegistered(universeId, original, warper);

        return warper;
    }

    function _universeOwner(uint256 universeId) internal view returns (address) {
        return IERC721Upgradeable(address(_universeToken)).ownerOf(universeId);
    }
}
