// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "../warper/IWarper.sol";
import "../warper/IWarperPreset.sol";
import "../warper/IWarperPresetFactory.sol";
import "../universe/IUniverseToken.sol";
import "../Errors.sol";
import "./IMetahub.sol";

/**
 * @dev Thrown when the message sender doesn't match the universe owner.
 */
error CallerIsNotUniverseOwner();

/**
 * @dev Thrown when performing action or accessing data of an unknown warper.
 * @param warper Warper address.
 */
error WarperIsNotRegistered(address warper);

contract Metahub is IMetahub, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Warper preset factory contract.
     */
    IWarperPresetFactory internal _warperPresetFactory;

    /**
     * @dev Universe NFT contract.
     */
    IUniverseToken internal _universeToken;

    /**
     * @dev Registered warpers.
     */
    mapping(address => Warper) internal _warpers;

    /**
     * @dev Mapping from universe token ID to the set of warper addresses.
     */
    mapping(uint256 => EnumerableSetUpgradeable.AddressSet) internal _universeWarpers;

    /**
     * @dev Mapping from original asset address to the set of warper addresses.
     */
    mapping(address => EnumerableSetUpgradeable.AddressSet) internal _assetWarpers;

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
        return _registerWarper(universeId, _deployWarperAndCall(original, presetId, bytes("")));
    }

    /**
     * @inheritdoc IMetahub
     */
    function deployWarperAndCall(
        uint256 universeId,
        address original,
        bytes32 presetId,
        bytes calldata presetData
    ) external onlyUniverseOwner(universeId) returns (address) {
        if (presetData.length == 0) {
            revert EmptyPresetData();
        }
        return _registerWarper(universeId, _deployWarperAndCall(original, presetId, presetData));
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
    function isWarperAdmin(address warper, address account) external view returns (bool) {
        uint256 universeId = _warpers[warper].universeId;
        if (universeId == 0) {
            revert WarperIsNotRegistered(warper);
        }
        // Universe owner is the default admin for all presets.
        return _universeOwner(universeId) == account;
    }

    /**
     * @dev Checks whether the caller is authorized to upgrade the Metahub implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function _deployWarperAndCall(
        address original,
        bytes32 presetId,
        bytes memory presetData
    ) internal returns (address) {
        // Build warper initialization payload.
        bool hasExtraData = presetData.length > 0;
        bytes[] memory initCalls = new bytes[](hasExtraData ? 2 : 1);

        // Call warper default initialization method first.
        initCalls[0] = abi.encodeWithSelector(IWarperPreset.__initialize.selector, abi.encode(original, address(this)));

        // Optionally add extra initialization call to the sequence.
        if (hasExtraData) {
            initCalls[1] = presetData;
        }

        // Deploy new warper instance from preset via warper preset factory.
        return _warperPresetFactory.deployPreset(presetId, initCalls);
    }

    function _registerWarper(uint256 universeId, address warper) internal returns (address) {
        //todo: assert correct initialization? _verifyWarper()
        //todo: check if warper is not already registered!
        //todo: check warper count against limits to prevent uncapped enumeration.

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
