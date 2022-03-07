// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "./IMetahub.sol";
import "../warper/IWarperPresetFactory.sol";
import "../warper/IWarper.sol";
import "../universe/IUniverseToken.sol";
import "../asset/IAssetController.sol";
import "../asset/IAssetVault.sol";
import "../acl/IACL.sol";

abstract contract MetahubStorage {
    /**
     * @dev Registered warper data.
     * @param enabled True if the warper is enabled and operational.
     * @param universeId Warper universe ID.
     * @param controller Warper asset controller.
     */
    struct WarperData {
        bool enabled; //todo: must affect renting
        uint256 universeId;
        IAssetController controller;
    }

    /**
     * @dev Original asset data.
     * @param controller Asset controller.
     * @param vault Asset vault.
     * @param warpers Set of warper addresses registered for the asset.
     */
    struct AssetData {
        IAssetController controller;
        IAssetVault vault;
        EnumerableSetUpgradeable.AddressSet warpers;
    }

    /**
     * @dev Universe data.
     * @param warpers Set of warper addresses registered by the universe.
     */
    struct UniverseData {
        EnumerableSetUpgradeable.AddressSet warpers;
    }

    /**
     * @dev Warper preset factory contract.
     */
    IWarperPresetFactory internal _warperPresetFactory;

    /**
     * @dev Universe NFT contract.
     */
    IUniverseToken internal _universeToken;

    /**
     * @dev ACL contract.
     */
    IACL internal _aclContract;

    /**
     * @dev Listing ID tracker (incremental counter).
     */
    CountersUpgradeable.Counter internal _listingIdTracker;

    /**
     * @dev Mapping from warper address to the warper entry.
     */
    mapping(address => WarperData) internal _warpers;

    /**
     * @dev Mapping from universe ID to the universe entry.
     */
    mapping(uint256 => UniverseData) internal _universes;

    /**
     * @dev Mapping from listing ID to the listing details.
     */
    mapping(uint256 => IListingManager.Listing) internal _listings;

    /**
     * @dev Mapping from asset class ID to the asset class configuration.
     */
    mapping(bytes4 => IAssetClassManager.AssetClassConfig) internal _assetClasses;

    /**
     * @dev Mapping from asset address to the asset details.
     */
    mapping(address => AssetData) internal _assets;
}
