// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./IUniverseToken.sol";

library Universes {
    using Universes for Registry;

    /**
     * @dev Thrown when a check is made where the given account must also be the universe owner.
     */
    error AccountIsNotUniverseOwner(address account);

    /**
     * @dev Universe data.
     * @param rentalFeePercent The fixed part of the total rental fee paid to universe (100 is 1%, 10_000 is 100%)
     */
    struct Universe {
        uint16 rentalFeePercent;
    }

    /**
     * Universe registry.
     * @param token Universe NFT contract.
     * @dev universes Mapping from a universe ID to the universe information.
     */
    struct Registry {
        IUniverseToken token;
        mapping(uint256 => Universe) universes;
    }

    // todo: docs
    function add(
        Registry storage self,
        uint256 universeId,
        Universe memory universe
    ) internal {
        self.universes[universeId] = universe;
    }

    /**
     * @dev Returns Universe owner address.
     * @param universeId Universe ID.
     * @return Universe owner.
     */
    function universeOwner(Registry storage self, uint256 universeId) internal view returns (address) {
        return IERC721Upgradeable(address(self.token)).ownerOf(universeId);
    }

    /**
     * @dev Throws if the universe owner is not the provided account address.
     * @param universeId Universe ID.
     * @param account The address of the expected owner.
     */
    function checkUniverseOwner(
        Registry storage self,
        uint256 universeId,
        address account
    ) internal view {
        if (!self.isUniverseOwner(universeId, account)) revert AccountIsNotUniverseOwner(account);
    }

    /**
     * @dev Returns `true` if the universe owner is the supplied account address.
     * @param universeId Universe ID.
     * @param account The address of the expected owner.
     */
    function isUniverseOwner(
        Registry storage self,
        uint256 universeId,
        address account
    ) internal view returns (bool) {
        return self.universeOwner(universeId) == account;
    }
}
