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

abstract contract MetahubStorage {
    /**
     * @dev Registered warper entry.
     * @param enabled True if the warper is enabled and operational.
     * @param universeId Warper universe ID.
     * @param controller Warper asset controller.
     */
    struct Warper {
        bool enabled; //todo: must affect renting
        uint256 universeId;
        IAssetController controller;
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
     * @dev Listing ID tracker (incremental counter).
     */
    CountersUpgradeable.Counter internal _listingIdTracker;

    /**
     * @dev Mapping from incremental listing ID to the Listing entry.
     */
    mapping(uint256 => IListingManager.Listing) internal _listings;

    /**
     * @dev Mapping from asset class to the asset vault address.
     */
    mapping(bytes4 => IAssetVault) internal _assetClassVaults;

    /**
     * @dev Mapping from asset address to the vault where this asset is stored.
     */
    mapping(address => IAssetVault) internal _assetVaults;

    /**
     * @dev Mapping from asset class to the asset controller address.
     */
    mapping(bytes4 => IAssetController) internal _assetClassControllers;

    /**
     * @dev Mapping from asset address to the controller which is responsible for asset handling.
     */
    mapping(address => IAssetController) internal _assetControllers;

    /**
     * @dev Registered warpers.
     * @dev Mapping from warper address to the warper entry.
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
}
