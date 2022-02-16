// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./IMetahub.sol";
import "../warper/IWarperPresetFactory.sol";
import "../warper/IWarper.sol";
import "../universe/IUniverseToken.sol";

abstract contract MetahubStorage {
    /**
     * @dev Registered warper entry.
     * @param universeId Warper universe ID.
     * @param enabled True if the warper is enabled and operational.
     */
    struct Warper {
        uint256 universeId;
        //todo: add asset type?
        bool enabled;
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
}