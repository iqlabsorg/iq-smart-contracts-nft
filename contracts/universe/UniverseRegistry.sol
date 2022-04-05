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
contract UniverseRegistry is IUniverseRegistry, UniverseRegistryStorage, UUPSUpgradeable, AccessControlledUpgradeable {
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
        if (bytes(universeNameToCheck).length == 0) revert InvalidUniverseName();
        _;
    }

    /**
     * @dev Constructor that gets called for the implementation contract.
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {}

    /**
     * @dev UniverseRegistry initializer.
     * @param acl Address of the ACL contract.
     */
    function initialize(address acl) external initializer {
        __UUPSUpgradeable_init();

        _aclContract = IACL(acl);

        _universeToken = new UniverseToken(address(this));
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
        _universes[universeId] = params;

        emit UniverseChanged(universeId, params.name);

        return universeId;
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function setUniverseName(uint256 universeId, string memory name)
        external
        onlyValidUniverseName(name)
        onlyUniverseOwner(universeId)
    {
        _universes[universeId].name = name;

        emit UniverseNameChanged(universeId, name);
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function setUniverseRentalFee(uint256 universeId, uint16 rentalFeePercent) external onlyUniverseOwner(universeId) {
        _universes[universeId].rentalFeePercent = rentalFeePercent;

        emit UniverseRentalFeeChanged(universeId, rentalFeePercent);
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function universe(uint256 universeId)
        external
        view
        returns (
            string memory name,
            string memory symbol,
            string memory uniName,
            uint16 rentalFeePercent
        )
    {
        name = _universeToken.name();
        symbol = _universeToken.symbol();
        uniName = _universes[universeId].name;
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
    function universeFeePercent(uint256 universeId) external view returns (uint16 rentalFeePercent) {
        return _universes[universeId].rentalFeePercent;
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function universeName(uint256 universeId) external view returns (string memory) {
        return _universes[universeId].name;
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function checkUniverseOwner(uint256 universeId, address account) external view {
        _checkUniverseOwner(universeId, account);
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function universeOwner(uint256 universeId) external view returns (address) {
        return _universeToken.ownerOf(universeId);
    }

    /**
     * @inheritdoc IUniverseRegistry
     */
    function isUniverseOwner(uint256 universeId, address account) external view returns (bool) {
        return _isUniverseOwner(universeId, account);
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
     * @dev Return `true` if the account is the owner of the universe.
     */
    function _isUniverseOwner(uint256 universeId, address account) internal view returns (bool) {
        return _universeToken.ownerOf(universeId) == account;
    }

    function _authorizeUpgrade(address newImplementation) internal virtual override onlyAdmin {}
}
