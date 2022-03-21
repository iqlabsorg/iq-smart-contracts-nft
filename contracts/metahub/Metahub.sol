// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "../acl/AccessControlled.sol";
import "../asset/IAssetController.sol";
import "../asset/IAssetVault.sol";
import "../warper/Warpers.sol";
import "../warper/IWarper.sol";
import "../warper/ERC721/IERC721Warper.sol";
import "../warper/IWarperPreset.sol";
import "../warper/IWarperPresetFactory.sol";
import "../warper/IWarperController.sol";
import "../universe/IUniverseToken.sol";
import "../listing/IListingController.sol";
import "../Errors.sol";
import "./IMetahub.sol";
import "./MetahubStorage.sol";
import "./Protocol.sol";

// todo: review lib imports
contract Metahub is IMetahub, Initializable, UUPSUpgradeable, AccessControlled, MetahubStorage {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using Assets for Assets.Asset;
    using Assets for Assets.Info;
    using Assets for Assets.Registry;
    using Listings for Listings.Info;
    using Listings for Listings.Registry;
    using Rentings for Rentings.Registry;
    using Warpers for Warpers.Info;
    using Warpers for Warpers.Registry;
    using Universes for Universes.Registry;

    /**
     * @dev Modifier to make a function callable only by the universe owner.
     */
    modifier onlyUniverseOwner(uint256 universeId) {
        _universeRegistry.checkUniverseOwner(universeId, _msgSender());
        _;
    }

    /**
     * @dev Modifier to make a function callable only by the warpers admin (universe owner).
     */
    modifier onlyWarperAdmin(address warper) {
        _checkWarperAdmin(warper, _msgSender());
        _;
    }

    /**
     * @dev Modifier to make a function callable only by the asset lister (original owner).
     */
    modifier onlyLister(uint256 listingId) {
        if (_msgSender() != _listingRegistry.listings[listingId].lister) revert CallerIsNotAssetLister();
        _;
    }

    /**
     * @dev Modifier to make sure the function is called for the active listing.
     */
    modifier listed(uint256 listingId) {
        _listingRegistry.checkListed(listingId);
        _;
    }

    /**
     * @dev Modifier to make sure that the warper has been registered beforehand.
     */
    modifier registeredWarper(address warper) {
        _warperRegistry.checkRegisteredWarper(warper);
        _;
    }

    /**
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {}

    /** // todo: docs
     * @dev Metahub initializer.
     * @param warperPresetFactory Warper preset factory address.
     */
    function initialize(
        address warperPresetFactory,
        address universeToken,
        address acl,
        address baseToken,
        uint16 rentalFeePercent
    ) external initializer {
        __UUPSUpgradeable_init();

        // todo perform interface checks?
        _aclContract = IACL(acl);
        _protocol = Protocol.Info({baseToken: IERC20Upgradeable(baseToken), rentalFeePercent: rentalFeePercent});

        _warperRegistry.presetFactory = IWarperPresetFactory(warperPresetFactory);
        _universeRegistry.token = IUniverseToken(universeToken);
    }

    /**
     * @inheritdoc IRentingManager
     */
    function estimateRent(Rentings.Params calldata params)
        public
        view
        returns (
            uint256 listerBaseFee,
            uint256 listerPremium,
            uint256 universeBaseFee,
            uint256 universePremium,
            uint256 protocolFee,
            uint256 total
        )
    {
        // Check if asset listing is active.
        _listingRegistry.checkListed(params.listingId);

        // Find selected listing.
        Listings.Info storage listing = _listingRegistry.listings[params.listingId];

        //todo: validate max lock time

        // Check whether listing is not paused.
        if (listing.paused) revert Listings.ListingIsPaused();

        // Find selected warper.
        Warpers.Info storage warper = _warperRegistry.warpers[params.warper];

        // Check whether the warper is not paused.
        if (warper.paused) revert Warpers.WarperIsPaused();

        // Check if the renting request can be fulfilled by selected warper.
        Assets.Asset memory asset = listing.asset;
        //todo: warper.validateRentingParams(asset, rentingParams)
        warper.controller.validateRentingParams(asset, params);

        return _calculateRentalFee(asset, warper, listing.params, params);
    }

    /**
     * @inheritdoc IRentingManager
     */
    function rent(Rentings.Params calldata params, uint256 maxPaymentAmount) external returns (uint256) {
        // Message sender must match the renter address since the estimation might be renter specific.
        if (_msgSender() != params.renter) revert CallerIsNotRenter();

        // Estimate renting.
        (
            uint256 listerBaseFee,
            uint256 listerPremium,
            uint256 universeBaseFee,
            uint256 universePremium,
            uint256 protocolFee,
            uint256 totalRentalFee
        ) = estimateRent(params);

        // Ensure no rental fee payment slippage.
        if (totalRentalFee > maxPaymentAmount) revert RentalPriceSlippage();

        //        uint256 listerFee = listerBaseFee + listerPremium;
        //        uint256 universeFee = universeBaseFee + universePremium;

        // Find selected listing.
        Listings.Info storage listing = _listingRegistry.listings[params.listingId];

        // Handle payments.
        //        _protocol.baseToken.safeTransferFrom(_msgSender(), listing.lister, listerFee);

        // todo: pay to Universe
        // todo: pay to Protocol

        // todo: warp original asset (mint warper via controller.warp(asset, renter))

        uint32 startTime = _blockTimestamp();
        uint32 endTime = startTime + params.rentalPeriod;

        // todo: update listing lock time
        _listingRegistry.listings[params.listingId].addLock(endTime);

        //todo: hash AssetId to associate warper rental (pass to renting registry)

        Rentings.Agreement memory rentalAgreement = Rentings.Agreement({
            listingId: params.listingId,
            warper: params.warper,
            renter: params.renter,
            startTime: startTime,
            endTime: endTime
        });

        uint256 rentalId = _rentingRegistry.add(rentalAgreement);

        //todo: clean up x2 expired rental agreements
        // todo: emit AssetRented event

        return rentalId;
    }

    /**
     * @inheritdoc IAssetClassManager
     */
    function registerAssetClass(bytes4 assetClass, Assets.ClassConfig calldata config) external onlyAdmin {
        _assetRegistry.registerAssetClass(assetClass, config);
        emit AssetClassRegistered(assetClass, address(config.controller), address(config.vault));
    }

    /**
     * @inheritdoc IAssetClassManager
     */
    function setAssetClassVault(bytes4 assetClass, address vault) external onlyAdmin {
        _assetRegistry.setAssetClassVault(assetClass, vault);
        emit AssetClassVaultChanged(assetClass, vault);
    }

    /**
     * @inheritdoc IAssetClassManager
     */
    function setAssetClassController(bytes4 assetClass, address controller) external onlyAdmin {
        _assetRegistry.setAssetClassController(assetClass, controller);
        emit AssetClassControllerChanged(assetClass, controller);
    }

    /**
     * @inheritdoc IAssetClassManager
     */
    function assetClassConfig(bytes4 assetClass) external view returns (Assets.ClassConfig memory) {
        return _assetRegistry.classes[assetClass];
    }

    /**
     * @inheritdoc IUniverseManager
     */
    function createUniverse(UniverseParams calldata params) external returns (uint256) {
        uint256 universeId = _universeRegistry.token.mint(_msgSender(), params.name);
        _universeRegistry.add(universeId, Universes.Universe(params.rentalFeePercent));

        emit UniverseCreated(universeId, params.name);

        return universeId;
    }

    /**
     * @inheritdoc IUniverseManager
     */
    function universe(uint256 universeId)
        external
        returns (
            string memory name,
            string memory symbol,
            string memory universeName
        )
    {
        IUniverseToken universeToken = _universeRegistry.token;
        name = universeToken.name();
        symbol = universeToken.symbol();
        universeName = universeToken.universeName(universeId);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function deployWarper(
        uint256 universeId,
        address original,
        bytes32 presetId
    ) external onlyUniverseOwner(universeId) returns (address warper) {
        address warper = _deployWarperWithData(original, presetId, bytes(""));
        _registerWarper(universeId, warper, true);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function deployWarperWithData(
        uint256 universeId,
        address original,
        bytes32 presetId,
        bytes calldata presetData
    ) external onlyUniverseOwner(universeId) returns (address warper) {
        if (presetData.length == 0) revert EmptyPresetData();
        address warper = _deployWarperWithData(original, presetId, presetData);
        _registerWarper(universeId, warper, true);
    }

    /**
     * @inheritdoc IListingManager
     */
    function registerListingStrategy(bytes4 strategyId, Listings.StrategyInfo calldata config) external onlyAdmin {
        _listingRegistry.registerStrategy(strategyId, config);
        //todo: event
    }

    /**
     * @inheritdoc IListingManager
     */
    function setListingController(bytes4 strategyId, address controller) external onlySupervisor {
        _listingRegistry.setListingStrategyController(strategyId, controller);
        //todo: event
    }

    /**
     * @inheritdoc IListingManager
     */
    function listingStrategy(bytes4 strategyId) external view returns (Listings.StrategyInfo memory) {
        _listingRegistry.checkListingStrategySupport(strategyId);
        return _listingRegistry.strategies[strategyId];
    }

    /**
     * @inheritdoc IListingManager
     */
    function listAsset(
        Assets.Asset calldata asset,
        Listings.Params calldata params,
        uint32 maxLockPeriod
    ) external returns (uint256) {
        // Check that listing asset class is supported.
        _assetRegistry.checkAssetClassSupport(asset.id.class);

        // Check that listing strategy is supported.
        _listingRegistry.checkListingStrategySupport(params.strategy);

        // Transfer asset from lister account to the vault.
        _assetRegistry.transferAssetToVault(asset, _msgSender());

        // Register listing.
        Listings.Info memory listing = Listings.Info(_msgSender(), asset, params, maxLockPeriod, 0, false, false);
        uint256 listingId = _listingRegistry.add(listing);

        emit AssetListed(listingId, listing.lister, listing.asset, listing.params, listing.maxLockPeriod);

        return listingId;
    }

    /**
     * @inheritdoc IListingManager
     */
    function delistAsset(uint256 listingId) external listed(listingId) onlyLister(listingId) {
        Listings.Info storage listing = _listingRegistry.listings[listingId];
        listing.delisted = true;
        emit AssetDelisted(listingId, listing.lister, listing.lockedTill);
    }

    /**
     * @inheritdoc IListingManager
     */
    function withdrawAsset(uint256 listingId) external onlyLister(listingId) {
        Listings.Info memory listing = _listingRegistry.listings[listingId];
        // Check whether the asset can be returned to the owner.
        if (_blockTimestamp() < listing.lockedTill) revert AssetIsLocked();

        // Delete listing record.
        _listingRegistry.remove(listingId);

        // Transfer asset from the vault to the original owner.
        _assetRegistry.returnAssetFromVault(listing.asset);

        emit AssetWithdrawn(listingId, listing.lister, listing.asset);
    }

    /**
     * @inheritdoc IListingManager
     */
    function pauseListing(uint256 listingId) external listed(listingId) onlyLister(listingId) {
        _listingRegistry.listings[listingId].pause();
        emit ListingPaused(listingId);
    }

    /**
     * @inheritdoc IListingManager
     */
    function unpauseListing(uint256 listingId) external listed(listingId) onlyLister(listingId) {
        _listingRegistry.listings[listingId].unpause();
        emit ListingUnpaused(listingId);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function pauseWarper(address warper) external onlyWarperAdmin(warper) {
        _warperRegistry.warpers[warper].pause();
        emit WarperPaused(warper);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function unpauseWarper(address warper) external onlyWarperAdmin(warper) {
        _warperRegistry.warpers[warper].unpause();
        emit WarperUnpaused(warper);
    }

    /**
     * @inheritdoc IListingManager
     */
    function listingInfo(uint256 listingId) external view returns (Listings.Info memory) {
        return _listingRegistry.listings[listingId];
    }

    /**
     * @inheritdoc IWarperManager
     */
    function warperPresetFactory() external view returns (address) {
        return address(_warperRegistry.presetFactory);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function universeWarpers(uint256 universeId) external view returns (address[] memory) {
        return _warperRegistry.universeWarpers[universeId].values();
    }

    /**
     * @inheritdoc IWarperManager
     */
    function assetWarpers(address original) external view returns (address[] memory) {
        return _assetRegistry.assets[original].warpers.values();
    }

    /**
     * @inheritdoc IWarperManager
     */
    function isWarperAdmin(address warper, address account) external view registeredWarper(warper) returns (bool) {
        return _universeRegistry.isUniverseOwner(_warperRegistry.warpers[warper].universeId, account);
    }

    /**
     * @inheritdoc IWarperManager
     */
    function warperInfo(address warper) external view registeredWarper(warper) returns (Warpers.Info memory) {
        return _warperRegistry.warpers[warper];
    }

    /**
     * @inheritdoc IMetahub
     */
    function baseToken() external view returns (address) {
        return address(_protocol.baseToken);
    }

    /**
     * @inheritdoc AccessControlled
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }

    /**
     * @dev Checks whether the caller is authorized to upgrade the Metahub implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    /**
     * @dev Constructs warper initialization payload and
     * calls warper preset factory to deploy a warper from preset.
     */
    function _deployWarperWithData(
        address original,
        bytes32 presetId,
        bytes memory presetData
    ) internal returns (address) {
        // Construct warper initialization payload call.
        // Put warper default initialization payload first, then append additional preset data.
        bytes memory initCall = abi.encodeWithSelector(
            IWarperPreset.__initialize.selector,
            abi.encode(original, address(this), presetData)
        );

        // Deploy new warper instance from preset via warper preset factory.
        return _warperRegistry.presetFactory.deployPreset(presetId, initCall);
    }

    /**
     * @dev Performs warper registration.
     * @param universeId The universe ID.
     * @param warper The warper address.
     * @param paused Indicates whether the warper should stay paused after registration.
     */
    function _registerWarper(
        uint256 universeId,
        address warper,
        bool paused
    ) internal {
        // Check that warper asset class is supported.
        bytes4 assetClass = IWarper(warper).__assetClass();
        _assetRegistry.checkAssetClassSupport(assetClass);

        // Check that warper is not already registered.
        _warperRegistry.checkNotRegisteredWarper(warper);

        // Check that warper has correct metahub reference.
        address warperMetahub = IWarper(warper).__metahub();
        if (warperMetahub != address(this)) revert WarperHasIncorrectMetahubReference(warperMetahub, address(this));

        IWarperController controller = IWarperController(_assetRegistry.classes[assetClass].controller);

        // Ensure warper compatibility with the current generation of asset controller.
        if (!controller.isCompatibleWarper(IWarper(warper))) revert InvalidWarperInterface();

        //todo: check warper count against limits to prevent uncapped enumeration.

        // Register warper. The warper is paused by default.
        _warperRegistry.add(warper, Warpers.Info({universeId: universeId, controller: controller, paused: paused}));

        // Associate the original asset with the the warper.
        address original = IWarper(warper).__original();
        _assetRegistry.assets[original].warpers.add(warper); // todo: lib

        // Register the original asset if it is seen for the first time.
        if (!_assetRegistry.isRegisteredAsset(original)) {
            _assetRegistry.registerAsset(assetClass, original);
            // todo: emit event AssetRegistered(asset);
        }

        emit WarperRegistered(universeId, original, warper);
    }

    /**
     * @dev Throws if the warpers universe owner is not the provided account address.
     * @param warper Warpers address.
     * @param account The address that's expected to be the warpers universe owner.
     */
    function _checkWarperAdmin(address warper, address account) internal view {
        _universeRegistry.checkUniverseOwner(_warperRegistry.warpers[warper].universeId, account);
    }

    /**
     * @dev Performs rental fee calculation and returns the fee breakdown.
     */
    function _calculateRentalFee(
        Assets.Asset memory asset,
        Warpers.Info memory warper,
        Listings.Params memory listingParams,
        Rentings.Params memory rentingParams
    )
        internal
        view
        returns (
            uint256 listerBaseFee,
            uint256 listerPremium,
            uint256 universeBaseFee,
            uint256 universePremium,
            uint256 protocolFee,
            uint256 total
        )
    {
        // Calculate lister base fee.
        // Resolve listing controller to calculate lister fee based on selected listing strategy.
        IListingController listingController = _listingRegistry.strategies[listingParams.strategy].controller;
        listerBaseFee = listingController.calculateRentalFee(listingParams, rentingParams);

        // Calculate universe base fee.
        uint16 universeRentalFeePercent = _universeRegistry.universes[warper.universeId].rentalFeePercent;
        universeBaseFee = (listerBaseFee * universeRentalFeePercent) / 10_000;

        // Calculate protocol fee.
        protocolFee = (listerBaseFee * _protocol.rentalFeePercent) / 10_000;

        // Calculate warper premiums.
        (universePremium, listerPremium) = warper.controller.calculatePremiums(
            asset,
            rentingParams,
            universeBaseFee,
            listerBaseFee
        );

        // Calculate TOTAL rental fee that will be paid by renter.
        total = listerBaseFee + listerPremium + universeBaseFee + universePremium + protocolFee;
    }

    /**
     * @inheritdoc IRentingManager
     */
    function warperActiveRentalCount(address warper, address account) external view returns (uint256 count) {
        _rentingRegistry.renterActiveRentalCountByWarper(account, warper);
    }

    //todo implement the real implementation here
    function getWarperRentalStatus(address warper, uint256 tokenId) external view returns (WarperRentalStatus) {
        return WarperRentalStatus.RENTED;
    }

    /**
     * @dev Returns the block timestamp truncated to 32 bits, i.e. mod 2**32.
     */
    function _blockTimestamp() internal view virtual returns (uint32) {
        return uint32(block.timestamp);
    }
}
