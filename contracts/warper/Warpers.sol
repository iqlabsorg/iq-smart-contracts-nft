// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./IWarperController.sol";
import "./IWarperPresetFactory.sol";

library Warpers {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using Warpers for Registry;

    /**
     * @dev Thrown when performing action or accessing data of an unknown warper.
     * @param warper Warper address.
     */
    error WarperIsNotRegistered(address warper);

    /**
     * @dev Thrown upon attempting to register a warper twice.
     * @param warper Duplicate warper address.
     */
    error WarperIsAlreadyRegistered(address warper);

    /**
     * @dev Thrown when the operation is not allowed due to the warper being paused.
     */
    error WarperIsPaused();

    /**
     * @dev Thrown when the operation is not allowed due to the warper not being paused.
     */
    error WarperIsNotPaused();

    /**
     * @dev Registered warper data.
     * @param controller Warper controller.
     * @param name Warper name.
     * @param universeId Warper universe ID.
     * @param paused Indicates whether the warper is paused.
     */
    struct Warper {
        IWarperController controller;
        string name;
        uint256 universeId;
        bool paused;
    }

    /**
     * @dev Puts the warper on pause.
     */
    function pause(Warper storage self) internal {
        if (self.paused) revert WarperIsPaused();

        self.paused = true;
    }

    /**
     * @dev Lifts the warper pause.
     */
    function unpause(Warper storage self) internal {
        if (!self.paused) revert WarperIsNotPaused();

        self.paused = false;
    }

    /**
     * @dev Throws if the warper is paused.
     */
    function checkNotPaused(Warper storage self) internal view {
        if (self.paused) revert WarperIsPaused();
    }

    /**
     * @dev Warper registry.
     * @param presetFactory Warper preset factory contract.
     * @param warpers Mapping from a warper address to the warper details.
     * @param universeWarpers Mapping from a universe ID to the set of warper addresses registered by the universe.
     */
    struct Registry {
        IWarperPresetFactory presetFactory;
        mapping(address => Warpers.Warper) warpers;
        mapping(uint256 => EnumerableSetUpgradeable.AddressSet) universeWarpers;
    }

    /**
     * @dev Checks warper registration by address.
     */
    function isRegisteredWarper(Registry storage self, address warper) internal view returns (bool) {
        return self.warpers[warper].universeId != 0;
    }

    /**
     * @dev Throws if warper is not registered.
     */
    function checkRegisteredWarper(Registry storage self, address warper) internal view {
        if (!self.isRegisteredWarper(warper)) revert WarperIsNotRegistered(warper);
    }

    /**
     * @dev Throws if warper is already registered.
     */
    function checkNotRegisteredWarper(Registry storage self, address warper) internal view {
        if (self.isRegisteredWarper(warper)) revert WarperIsAlreadyRegistered(warper);
    }

    /**
     * @dev Performs warper registration.
     */
    function register(
        Registry storage self,
        address warperAddress,
        Warper memory warper
    ) internal {
        // Check that warper is not already registered.
        self.checkNotRegisteredWarper(warperAddress);

        // Ensure warper compatibility with the current generation of asset controller.
        warper.controller.checkCompatibleWarper(warperAddress);
        //todo: check warper count against limits to prevent uncapped enumeration.

        // Create warper main registration record.
        self.warpers[warperAddress] = warper;
        // Associate the warper with the universe.
        self.universeWarpers[warper.universeId].add(warperAddress);
    }

    /**
     * @dev Removes warper data from the registry.
     */
    function remove(Registry storage self, address warper) internal {
        uint256 universeId = self.warpers[warper].universeId;
        self.universeWarpers[universeId].remove(warper);
        delete self.warpers[warper];
    }
}
