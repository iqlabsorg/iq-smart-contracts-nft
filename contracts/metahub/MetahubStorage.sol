// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./IMetahub.sol";
import "../warper/IWarperPresetFactory.sol";
import "../warper/IWarper.sol";
import "../universe/IUniverseToken.sol";
import "../asset/Assets.sol";
import "../acl/IACL.sol";
import "../user/Users.sol";

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
        IERC20Upgradeable baseToken;
        uint16 rentalFeePercent;
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
     * @dev Rental agreement ID tracker (incremental counter).
     */
    CountersUpgradeable.Counter internal _rentalIdTracker;

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
    mapping(uint256 => Listings.Info) internal _listings;

    /**
     * @dev Mapping from listing strategy ID to the listing strategy configuration.
     */
    mapping(bytes4 => IListingManager.ListingStrategyConfig) internal _listingStrategies;

    /**
     * @dev Mapping from asset class ID to the asset class configuration.
     */
    mapping(bytes4 => IAssetClassManager.AssetClassConfig) internal _assetClasses;

    /**
     * @dev Mapping from asset address to the asset details.
     */
    mapping(address => Assets.Info) internal _assets;

    /**
     * @dev Mapping from rental agreement ID to the rental agreement details.
     */
    mapping(uint256 => IRentingManager.RentalAgreement) internal _rentalAgreements;

    /**
     * @dev Mapping from user address to the user data.
     */
    mapping(address => Users.Info) internal _users;
}
