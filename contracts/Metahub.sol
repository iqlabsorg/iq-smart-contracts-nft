// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./interfaces/IMetahub.sol";
import "./interfaces/IWarper.sol";
import "./interfaces/IWarperPresetFactory.sol";
import "./interfaces/IUniverseToken.sol";
import "./Errors.sol";

/**
 * @dev Thrown when the message sender doesn't match the universe owner.
 */
error CallerIsNotUniverseOwner();

contract Metahub is IMetahub, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    // Warper preset factory contract.
    IWarperPresetFactory internal _warperPresetFactory;

    // Universe NFT contract.
    IUniverseToken internal _universeToken;

    // Mapping from universe token ID to the set of warper addresses.
    mapping(uint256 => EnumerableSetUpgradeable.AddressSet) private _universeWarpers;

    // Mapping from original asset address to the set of warper addresses.
    mapping(address => EnumerableSetUpgradeable.AddressSet) private _assetWarpers;

    modifier onlyUniverseOwner(uint256 universeId) {
        if (_msgSender() != IERC721Upgradeable(address(_universeToken)).ownerOf(universeId)) {
            revert CallerIsNotUniverseOwner();
        }
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /**
     * @dev Metahub initializer.
     * @param warperPresetFactory Warper preset factory address.
     */
    function initialize(address warperPresetFactory, address universeToken) public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();

        _warperPresetFactory = IWarperPresetFactory(warperPresetFactory);
        _universeToken = IUniverseToken(universeToken);
    }

    /**
     * @dev Checks whether the caller is authorized to upgrade the Metahub implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @inheritdoc IMetahub
     */
    function warperPresetFactory() external view returns (address) {
        return address(_warperPresetFactory);
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

    function _deployWarperAndCall(
        address original,
        bytes32 presetId,
        bytes memory presetData
    ) internal returns (address) {
        // Build warper initialization payload.
        bool hasExtraData = presetData.length > 0;
        bytes[] memory initCalls = new bytes[](hasExtraData ? 2 : 1);

        // Call warper default initialization method first.
        initCalls[0] = abi.encodeWithSelector(IWarper.iqInitialize.selector, abi.encode(original, address(this)));

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

        address original = IWarper(warper).iqOriginal();

        // Associate the warper with the universe.
        _universeWarpers[universeId].add(warper);

        // Associate the warper with the original asset.
        _assetWarpers[original].add(warper);

        emit WarperRegistered(universeId, original, warper);

        return warper;
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
    function universeWarpers(uint256 universeId) external view returns (address[] memory) {
        return _universeWarpers[universeId].values();
    }

    /**
     * @inheritdoc IMetahub
     */
    function assetWarpers(address original) external view returns (address[] memory) {
        return _assetWarpers[original].values();
    }
}
