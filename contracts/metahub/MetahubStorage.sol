// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./IMetahub.sol";
import "../warper/IWarperPresetFactory.sol";
import "../warper/IWarper.sol";
import "../warper/Warpers.sol";
import "../universe/IUniverseToken.sol";
import "../asset/Assets.sol";
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
     * @dev Asset registry contains data about all registered assets and supported asset classes.
     */
    Assets.Registry internal _assetRegistry;

    /**
     * @dev Listing registry contains data about all listings.
     */
    Listings.Registry internal _listingRegistry;

    /**
     * @dev Renting registry contains data about all rentals.
     */
    Rentings.Registry internal _rentingRegistry;

    /**
     * @dev Mapping from warper address to the warper entry.
     */
    mapping(address => Warpers.Info) internal _warpers;

    /**
     * @dev Mapping from universe ID to the universe entry.
     */
    mapping(uint256 => Universe) internal _universes;

    /**
     * @dev Mapping from listing strategy ID to the listing strategy configuration.
     */
    mapping(bytes4 => IListingManager.ListingStrategyConfig) internal _listingStrategies;
}
