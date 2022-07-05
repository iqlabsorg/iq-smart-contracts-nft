// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import "./IWarperController.sol";
import "./IWarperPresetFactory.sol";
import "../asset/Assets.sol";
import "./IWarperManager.sol";

library Warpers {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using Warpers for Registry;
    using Assets for Assets.Asset;
    using Assets for Assets.Registry;

    /**
     * @dev Thrown if provided warper address does not implement warper interface.
     */
    error InvalidWarperInterface();

    /**
     * @dev Thrown when the warper returned metahub address differs from the one it is being registered in.
     * @param provided Metahub address returned by warper.
     * @param required Required metahub address.
     */
    error WarperHasIncorrectMetahubReference(address provided, address required);

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
     * @dev Thrown when there are no registered warpers for a particular asset.
     * @param asset Asset address.
     */
    error UnsupportedAsset(address asset);

    /**
     * @dev Thrown upon attempting to use the warper which is not registered for the provided asset.
     */
    error IncompatibleAsset(address asset);

    /**
     * @dev Registered warper data.
     * @param assetClass The identifying asset class.
     * @param original Original asset contract address.
     * @param paused Indicates whether the warper is paused.
     * @param controller Warper controller.
     * @param name Warper name.
     * @param universeId Warper universe ID.
     */
    struct Warper {
        bytes4 assetClass;
        address original;
        bool paused;
        IWarperController controller;
        string name;
        uint256 universeId;
    }

    /**
     * @dev Reverts if the warper original does not match the `asset`;
     */
    function checkCompatibleAsset(Warper memory self, Assets.Asset memory asset) internal pure {
        address original = asset.token();
        if (self.original != original) revert IncompatibleAsset(original);
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
     * @dev Reverts if the warper is paused.
     */
    function checkNotPaused(Warper memory self) internal pure {
        if (self.paused) revert WarperIsPaused();
    }

    /**
     * @dev Warper registry.
     * @param presetFactory Warper preset factory contract.
     * @param warperIndex Set of registered warper addresses.
     * @param universeWarperIndex Mapping from a universe ID to the set of warper addresses registered by the universe.
     * @param assetWarperIndex Mapping from an original asset address to the set of warper addresses,
     * registered for the asset.
     * @param warpers Mapping from a warper address to the warper details.
     */
    struct Registry {
        IWarperPresetFactory presetFactory;
        EnumerableSetUpgradeable.AddressSet warperIndex;
        mapping(uint256 => EnumerableSetUpgradeable.AddressSet) universeWarperIndex;
        mapping(address => EnumerableSetUpgradeable.AddressSet) assetWarperIndex;
        mapping(address => Warpers.Warper) warpers;
    }

    /**
     * @dev Performs warper registration.
     * @param warper Warper address.
     * @param params Warper registration params.
     */
    function registerWarper(
        Registry storage self,
        address warper,
        IWarperManager.WarperRegistrationParams calldata params,
        Assets.Registry storage assetRegistry
    ) internal returns (bytes4 assetClass, address original) {
        // Check that provided warper address is a valid contract.
        if (!warper.isContract() || !warper.supportsInterface(type(IWarper).interfaceId)) {
            revert InvalidWarperInterface();
        }

        // Check that warper has correct metahub reference.
        address metahub = IWarper(warper).__metahub();
        if (metahub != address(this)) revert WarperHasIncorrectMetahubReference(metahub, address(this));

        // Check that warper asset class is supported.
        assetClass = IWarper(warper).__assetClass();

        // Retrieve warper controller based on assetClass.
        // Controller resolution for unsupported asset class will revert.
        IWarperController controller = IWarperController(assetRegistry.assetClassController(assetClass));

        // Ensure warper compatibility with the current generation of asset controller.
        controller.checkCompatibleWarper(warper);

        // Retrieve original asset address.
        original = IWarper(warper).__original();

        // Save warper record.
        _register(
            self,
            warper,
            Warpers.Warper({
                original: original,
                controller: controller,
                name: params.name,
                universeId: params.universeId,
                paused: params.paused,
                assetClass: assetClass
            })
        );
    }

    /**
     * @dev Performs warper registration.
     */
    function _register(
        Registry storage self,
        address warperAddress,
        Warper memory warper
    ) private {
        if (!self.warperIndex.add(warperAddress)) revert WarperIsAlreadyRegistered(warperAddress);

        // Create warper main registration record.
        self.warpers[warperAddress] = warper;
        // Associate the warper with the universe.
        self.universeWarperIndex[warper.universeId].add(warperAddress);
        // Associate the warper with the original asset.
        self.assetWarperIndex[warper.original].add(warperAddress);
    }

    /**
     * @dev Removes warper data from the registry.
     */
    function remove(Registry storage self, address warperAddress) internal {
        Warper storage warper = self.warpers[warperAddress];
        // Clean up universe index.
        self.universeWarperIndex[warper.universeId].remove(warperAddress);
        // Clean up asset index.
        self.assetWarperIndex[warper.original].remove(warperAddress);
        // Clean up main index.
        self.warperIndex.remove(warperAddress);
        // Delete warper data.
        delete self.warpers[warperAddress];
    }

    /**
     * @dev Returns the paginated list of warpers belonging to the particular universe.
     */
    function universeWarpers(
        Registry storage self,
        uint256 universeId,
        uint256 offset,
        uint256 limit
    ) internal view returns (address[] memory, Warpers.Warper[] memory) {
        return self.paginateIndexedWarpers(self.universeWarperIndex[universeId], offset, limit);
    }

    /**
     * @dev Returns the paginated list of warpers associated with the particular original asset.
     */
    function assetWarpers(
        Registry storage self,
        address original,
        uint256 offset,
        uint256 limit
    ) internal view returns (address[] memory, Warpers.Warper[] memory) {
        return self.paginateIndexedWarpers(self.assetWarperIndex[original], offset, limit);
    }

    /**
     * @dev Checks warper registration by address.
     */
    function isRegisteredWarper(Registry storage self, address warper) internal view returns (bool) {
        return self.warperIndex.contains(warper);
    }

    /**
     * @dev Reverts if warper is not registered.
     */
    function checkRegisteredWarper(Registry storage self, address warper) internal view {
        if (!self.isRegisteredWarper(warper)) revert WarperIsNotRegistered(warper);
    }

    /**
     * @dev Reverts if asset is not supported.
     * @param asset Asset address.
     */
    function checkSupportedAsset(Registry storage self, address asset) internal view {
        if (!self.isSupportedAsset(asset)) revert UnsupportedAsset(asset);
    }

    /**
     * @dev Checks asset support by address.
     * The supported asset should have at least one warper.
     * @param asset Asset address.
     */
    function isSupportedAsset(Registry storage self, address asset) internal view returns (bool) {
        return self.assetWarperIndex[asset].length() > 0;
    }

    /**
     * @dev Returns the number of warpers belonging to the particular universe.
     */
    function universeWarperCount(Registry storage self, uint256 universeId) internal view returns (uint256) {
        return self.universeWarperIndex[universeId].length();
    }

    /**
     * @dev Returns the number of warpers associated with the particular original asset.
     */
    function assetWarperCount(Registry storage self, address original) internal view returns (uint256) {
        return self.assetWarperIndex[original].length();
    }

    /**
     * @dev Returns the paginated list of registered warpers using provided index reference.
     */
    function paginateIndexedWarpers(
        Registry storage self,
        EnumerableSetUpgradeable.AddressSet storage warperIndex,
        uint256 offset,
        uint256 limit
    ) internal view returns (address[] memory, Warper[] memory) {
        uint256 indexSize = warperIndex.length();
        if (offset >= indexSize) return (new address[](0), new Warper[](0));

        if (limit > indexSize - offset) {
            limit = indexSize - offset;
        }

        Warper[] memory warpers = new Warper[](limit);
        address[] memory warperAddresses = new address[](limit);
        for (uint256 i = 0; i < limit; i++) {
            warperAddresses[i] = warperIndex.at(offset + i);
            warpers[i] = self.warpers[warperAddresses[i]];
        }

        return (warperAddresses, warpers);
    }
}
