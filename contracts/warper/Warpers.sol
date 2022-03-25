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
     * @param universeId Warper universe ID.
     * @param controller Warper asset controller.
     * @param paused Indicates whether the warper is paused.
     */
    struct Warper {
        uint256 universeId;
        IWarperController controller;
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
    function add(
        Registry storage self,
        address warperAddress,
        Warper memory warper
    ) internal {
        // todo: check if not registered
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
