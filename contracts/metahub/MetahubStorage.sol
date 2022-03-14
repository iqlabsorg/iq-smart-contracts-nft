// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IMetahub.sol";
import "../warper/IWarperPresetFactory.sol";
import "../warper/IWarper.sol";
import "../universe/IUniverseToken.sol";
import "../asset/IAssetController.sol";
import "../asset/IAssetVault.sol";
import "../acl/IACL.sol";

abstract contract MetahubStorage {
    /**
     * @dev Protocol configuration.
     * @param acl ACL contract.
     * @param warperPresetFactory Warper preset factory contract.
     * @param universeToken Universe NFT contract.
     * @param baseToken ERC20 contract. Used as the price denominator.
     * @param rentalFeePercent The fixed part of the total rental fee paid to protocol.
     */
    struct ProtocolConfig {
        IACL acl;
        IWarperPresetFactory warperPresetFactory;
        IUniverseToken universeToken;
        IERC20 baseToken;
        uint16 rentalFeePercent;
    }

    /**
     * @dev Original asset data.
     * @param controller Asset controller.
     * @param vault Asset vault.
     * @param warpers Set of warper addresses registered for the asset.
     */
    struct Asset {
        IAssetController controller;
        IAssetVault vault;
        EnumerableSetUpgradeable.AddressSet warpers;
    }

    /**
     * @dev Universe data.
     * @param rentalFeePercent The fixed part of the total rental fee paid to universe.
     * @param warpers Set of warper addresses registered by the universe.
     */
    struct Universe {
        uint16 rentalFeePercent;
        EnumerableSetUpgradeable.AddressSet warpers;
    }

    /// STORAGE ///
    ProtocolConfig internal _protocol;

    /**
     * @dev Listing ID tracker (incremental counter).
     */
    CountersUpgradeable.Counter internal _listingIdTracker;

    /**
     * @dev Mapping from warper address to the warper entry.
     */
    mapping(address => IWarperManager.Warper) internal _warpers;

    /**
     * @dev Mapping from universe ID to the universe entry.
     */
    mapping(uint256 => Universe) internal _universes;

    /**
     * @dev Mapping from listing ID to the listing details.
     */
    mapping(uint256 => IListingManager.Listing) internal _listings;

    /**
     * @dev Mapping from asset class ID to the asset class configuration.
     */
    mapping(bytes4 => IAssetClassManager.AssetClassConfig) internal _assetClasses;

    /**
     * @dev Mapping from listing strategy ID to the listing strategy configuration.
     */
    mapping(bytes4 => IListingManager.ListingStrategyConfig) internal _listingStrategies;

    /**
     * @dev Mapping from asset address to the asset details.
     */
    mapping(address => Asset) internal _assets;
}
