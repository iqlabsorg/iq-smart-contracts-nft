// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../acl/AccessControlledUpgradeable.sol";
import "./IUniverseRegistry.sol";
import "./UniverseToken.sol";
import "./UniverseRegistryStorage.sol";

/**
 * @title Universe Registry contract.
 */
contract UniverseRegistry is IUniverseRegistry, UUPSUpgradeable, AccessControlledUpgradeable, UniverseRegistryStorage {
    /**
     * @dev Modifier to make a function callable only by the universe owner.
     */
    modifier onlyUniverseOwner(uint256 universeId) {
        _checkUniverseOwner(universeId, _msgSender());
        _;
    }

    /**
     * @dev Modifier to check if the universe name is valid.
     */
    modifier onlyValidUniverseName(string memory universeNameToCheck) {
        if (bytes(universeNameToCheck).length == 0) revert EmptyUniverseName();
        _;
    }

    /**
     * @dev Modifier to check that the universe has been registered.
     */
    modifier onlyRegisteredUniverse(uint256 universeId) {
        _checkUniverseRegistered(universeId);
        _;
    }

    /**
     * @dev Constructor that gets called for the implementation contract.
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev UniverseRegistry initializer.
     * @param acl Address of the ACL contract.
     */
    function initialize(address acl) external initializer {
        __UUPSUpgradeable_init();

        _aclContract = IACL(acl);

        _universeToken = new UniverseToken(this);
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function setUniverseTokenBaseURI(string calldata baseURI) external onlySupervisor {
        _baseURI = baseURI;
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function createUniverse(UniverseParams calldata params)
        external
        onlyValidUniverseName(params.name)
        returns (uint256)
    {
        uint256 universeId = _universeToken.mint(_msgSender());
        _universes[universeId] = Universe({name: params.name, rentalFeePercent: params.rentalFeePercent});

        emit UniverseCreated(universeId, params.name);

        return universeId;
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function setUniverseName(uint256 universeId, string memory name)
        external
        onlyRegisteredUniverse(universeId)
        onlyValidUniverseName(name)
        onlyUniverseOwner(universeId)
    {
        _universes[universeId].name = name;

        emit UniverseNameChanged(universeId, name);
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function setUniverseRentalFeePercent(uint256 universeId, uint16 rentalFeePercent)
        external
        onlyRegisteredUniverse(universeId)
        onlyUniverseOwner(universeId)
    {
        _universes[universeId].rentalFeePercent = rentalFeePercent;

        emit UniverseRentalFeeChanged(universeId, rentalFeePercent);
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function universe(uint256 universeId)
        external
        view
        onlyRegisteredUniverse(universeId)
        returns (string memory name, uint16 rentalFeePercent)
    {
        name = _universes[universeId].name;
        rentalFeePercent = _universes[universeId].rentalFeePercent;
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function universeToken() external view returns (address) {
        return address(_universeToken);
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function universeTokenBaseURI() external view returns (string memory) {
        return _baseURI;
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function universeRentalFeePercent(uint256 universeId)
        external
        view
        onlyRegisteredUniverse(universeId)
        returns (uint16 rentalFeePercent)
    {
        return _universes[universeId].rentalFeePercent;
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function universeName(uint256 universeId) external view onlyRegisteredUniverse(universeId) returns (string memory) {
        return _universes[universeId].name;
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function checkUniverseOwner(uint256 universeId, address account) external view onlyRegisteredUniverse(universeId) {
        _checkUniverseOwner(universeId, account);
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function universeOwner(uint256 universeId) external view onlyRegisteredUniverse(universeId) returns (address) {
        return _universeToken.ownerOf(universeId);
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function isUniverseOwner(uint256 universeId, address account)
        external
        view
        onlyRegisteredUniverse(universeId)
        returns (bool)
    {
        return _isUniverseOwner(universeId, account);
    }

    /**
     * @inheritdoc UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }

    /**
     * @dev Revert if the passed account is not the owner of the universe.
     */
    function _checkUniverseOwner(uint256 universeId, address account) internal view {
        if (!_isUniverseOwner(universeId, account)) revert AccountIsNotUniverseOwner(account);
    }

    /**
     * @dev Revert if the universe has been registered properly.
     */
    function _checkUniverseRegistered(uint256 universeId) internal view {
        if (!_isValidUniverseName(universeId)) revert QueryForNonexistentUniverse(universeId);
    }

    /**
     * @dev Return `true` if the universe name is valid.
     */
    function _isValidUniverseName(uint256 universeId) internal view returns (bool) {
        return bytes(_universes[universeId].name).length != 0;
    }

    /**
     * @dev Return `true` if the account is the owner of the universe.
     */
    function _isUniverseOwner(uint256 universeId, address account) internal view returns (bool) {
        return _universeToken.ownerOf(universeId) == account;
    }
}
