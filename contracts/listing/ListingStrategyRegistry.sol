// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

import "../acl/AccessControlledUpgradeable.sol";
import "./IListingStrategyRegistry.sol";
import "./ListingStrategyRegistryStorage.sol";

contract ListingStrategyRegistry is
    IListingStrategyRegistry,
    UUPSUpgradeable,
    AccessControlledUpgradeable,
    ListingStrategyRegistryStorage
{
    using ERC165CheckerUpgradeable for address;

    /**
     * @dev Modifier to make a function callable only for the registered listing strategy.
     */
    modifier onlyRegisteredStrategy(bytes4 strategyId) {
        checkRegisteredListingStrategy(strategyId);
        _;
    }

    /**
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

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
        _checkValidListingController(strategyId, config.controller);
        if (isRegisteredListingStrategy(strategyId)) {
            revert ListingStrategyIsAlreadyRegistered(strategyId);
        }

        _strategies[strategyId] = config;
        emit ListingStrategyRegistered(strategyId, config.controller);
    }

    /**
     * @inheritdoc IListingStrategyRegistry
     */
    function setListingController(bytes4 strategyId, address controller)
        external
        onlySupervisor
        onlyRegisteredStrategy(strategyId)
    {
        _checkValidListingController(strategyId, controller);
        _strategies[strategyId].controller = controller;
        emit ListingStrategyControllerChanged(strategyId, controller);
    }

    /**
     * @inheritdoc IListingStrategyRegistry
     */
    function listingController(bytes4 strategyId) external view onlyRegisteredStrategy(strategyId) returns (address) {
        return _strategies[strategyId].controller;
    }

    /**
     * @inheritdoc IListingStrategyRegistry
     */
    function listingStrategy(bytes4 strategyId)
        external
        view
        onlyRegisteredStrategy(strategyId)
        returns (StrategyConfig memory)
    {
        return _strategies[strategyId];
    }

    /**
     * @inheritdoc IListingStrategyRegistry
     */
    function isRegisteredListingStrategy(bytes4 strategyId) public view returns (bool) {
        return _strategies[strategyId].controller != address(0);
    }

    /**
     * @inheritdoc IListingStrategyRegistry
     */
    function checkRegisteredListingStrategy(bytes4 strategyId) public view {
        if (!isRegisteredListingStrategy(strategyId)) revert UnregisteredListingStrategy(strategyId);
    }

    /**
     * @inheritdoc UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Reverts if provided address is not a valid listing controller.
     * @param strategyId Listing strategy ID.
     * @param controller Listing controller address.
     */
    function _checkValidListingController(bytes4 strategyId, address controller) internal view {
        if (!controller.supportsInterface(type(IListingController).interfaceId))
            revert InvalidListingControllerInterface();

        bytes4 contractStrategyId = IListingController(controller).strategyId();
        if (contractStrategyId != strategyId) revert ListingStrategyMismatch(contractStrategyId, strategyId);
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }
}
