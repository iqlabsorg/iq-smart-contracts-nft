// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import "../acl/AccessControlledUpgradeable.sol";
import "./IListingStrategyRegistry.sol";

contract ListingStrategyRegistry is IListingStrategyRegistry, UUPSUpgradeable, AccessControlledUpgradeable {
    using ERC165CheckerUpgradeable for address;

    /**
     * @dev ACL contract.
     */
    IACL private _aclContract;

    /**
     * @dev Mapping from listing strategy ID to the listing strategy configuration.
     */
    mapping(bytes4 => StrategyConfig) _registry;

    /**
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {}

    /**
     * @dev Contract initializer.
     * @param acl ACL contract address.
     */
    function initialize(address acl) external initializer {
        __UUPSUpgradeable_init();
        _aclContract = IACL(acl);
    }

    /**
     * @inheritdoc IListingStrategyRegistry
     */
    function registerListingStrategy(bytes4 strategyId, StrategyConfig calldata config) external onlyAdmin {
        _checkValidListingController(address(config.controller));
        if (isRegisteredListingStrategy(strategyId)) {
            revert ListingStrategyIsAlreadyRegistered(strategyId);
        }

        _registry[strategyId] = config;
        //todo: event
    }

    /**
     * @inheritdoc IListingStrategyRegistry
     */
    function setListingController(bytes4 strategyId, address controller) external onlySupervisor {
        _checkRegisteredListingStrategy(strategyId);
        _checkValidListingController(controller);
        _registry[strategyId].controller = IListingController(controller);
        //todo: event
    }

    /**
     * @inheritdoc IListingStrategyRegistry
     */
    function listingController(bytes4 strategyId) external view returns (address) {
        return address(_registry[strategyId].controller);
    }

    /**
     * @inheritdoc IListingStrategyRegistry
     */
    function listingStrategy(bytes4 strategyId) external view returns (StrategyConfig memory) {
        _checkRegisteredListingStrategy(strategyId);
        return _registry[strategyId];
    }

    /**
     * @inheritdoc IListingStrategyRegistry
     */
    function isRegisteredListingStrategy(bytes4 strategyId) public view returns (bool) {
        return address(_registry[strategyId].controller) != address(0);
    }

    /**
     * @dev Throws if listing strategy is not registered.
     * @param strategyId Listing strategy ID.
     */
    function _checkRegisteredListingStrategy(bytes4 strategyId) internal view {
        if (!isRegisteredListingStrategy(strategyId)) revert UnregisteredListingStrategy(strategyId);
    }

    /**
     * @dev Throws if provided address is not a valid listing controller.
     * @param controller Listing controller address.
     */
    function _checkValidListingController(address controller) internal view {
        if (!controller.supportsInterface(type(IListingController).interfaceId))
            revert InvalidListingControllerInterface();
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
}
