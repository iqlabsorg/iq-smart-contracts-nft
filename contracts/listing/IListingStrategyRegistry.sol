// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./Listings.sol";
import "./IListingController.sol";

interface IListingStrategyRegistry {
    /**
     * @dev Thrown when listing controller does not implement the required interface.
     */
    error InvalidListingControllerInterface();

    /**
     * @dev Thrown when the listing cannot be processed by the specific controller due to the listing strategy ID
     * mismatch.
     * @param provided Provided listing strategy ID.
     * @param required Required listing strategy ID.
     */
    error ListingStrategyMismatch(bytes4 provided, bytes4 required);

    /**
     * @dev Thrown upon attempting to register a listing strategy twice.
     * @param strategyId Duplicate listing strategy ID.
     */
    error ListingStrategyIsAlreadyRegistered(bytes4 strategyId);

    /**
     * @dev Thrown upon attempting to work with unregistered listing strategy.
     * @param strategyId Listing strategy ID.
     */
    error UnregisteredListingStrategy(bytes4 strategyId);

    /**
     * @dev Emitted when the new listing strategy is registered.
     * @param strategyId Listing strategy ID.
     * @param controller Controller address.
     */
    event ListingStrategyRegistered(bytes4 indexed strategyId, address indexed controller);

    /**
     * @dev Emitted when the listing strategy controller is changed.
     * @param strategyId Listing strategy ID.
     * @param newController Controller address.
     */
    event ListingStrategyControllerChanged(bytes4 indexed strategyId, address indexed newController);

    /**
     * @dev Listing strategy information.
     * @param controller Listing controller address.
     */
    struct StrategyConfig {
        address controller;
    }

    /**
     * @dev Registers new listing strategy.
     * @param strategyId Listing strategy ID.
     * @param config Listing strategy configuration.
     */
    function registerListingStrategy(bytes4 strategyId, StrategyConfig calldata config) external;

    /**
     * @dev Sets listing strategy controller.
     * @param strategyId Listing strategy ID.
     * @param controller Listing controller address.
     */
    function setListingController(bytes4 strategyId, address controller) external;

    /**
     * @dev Returns listing strategy configuration.
     * @param strategyId Listing strategy ID.
     * @return Listing strategy information.
     */
    function listingStrategy(bytes4 strategyId) external view returns (StrategyConfig memory);

    /**
     * @dev Returns listing strategy controller.
     * @param strategyId Listing strategy ID.
     * @return Listing controller address.
     */
    function listingController(bytes4 strategyId) external view returns (address);

    /**
     * @dev Checks listing strategy registration.
     * @param strategyId Listing strategy ID.
     */
    function isRegisteredListingStrategy(bytes4 strategyId) external view returns (bool);

    /**
     * @dev Throws if listing strategy is not registered.
     * @param strategyId Listing strategy ID.
     */
    function checkRegisteredListingStrategy(bytes4 strategyId) external view;
}
