// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "../acl/AccessControlledUpgradeable.sol";
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
import "../accounting/Accounts.sol";
import "../accounting/Accounts.sol";

// todo: review lib imports
contract Metahub is IMetahub, Initializable, UUPSUpgradeable, AccessControlledUpgradeable, MetahubStorage {
    using Address for address;
    using ERC165CheckerUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using Accounts for Accounts.Account;
    using Assets for Assets.Asset;
    using Assets for Assets.AssetConfig;
    using Assets for Assets.Registry;
    using Listings for Listings.Listing;
    using Listings for Listings.Registry;
    using Rentings for Rentings.Registry;
    using Warpers for Warpers.Warper;
    using Warpers for Warpers.Registry;
    using Universes for Universes.Registry;
    using Protocol for Protocol.Config;

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

    /** todo: docs
     * @dev Metahub initialization params.
     * @param warperPresetFactory Warper preset factory address.
     */
    struct MetahubInitParams {
        IWarperPresetFactory warperPresetFactory;
        IAssetClassRegistry assetClassRegistry;
        IListingStrategyRegistry listingStrategyRegistry;
        IUniverseToken universeToken;
        IACL acl;
        IERC20Upgradeable baseToken;
        uint16 rentalFeePercent;
    }

    /**
     * @dev Metahub initializer.
     * @param params Initialization params.
     */
    function initialize(MetahubInitParams calldata params) external initializer {
        __UUPSUpgradeable_init();

        _aclContract = params.acl;
        _protocol = Protocol.Config({baseToken: params.baseToken, rentalFeePercent: params.rentalFeePercent});

        _warperRegistry.presetFactory = params.warperPresetFactory;
        _assetRegistry.classRegistry = params.assetClassRegistry;
        _listingRegistry.strategyRegistry = params.listingStrategyRegistry;
        _universeRegistry.token = params.universeToken;
    }

    /**
     * @inheritdoc IRentingManager
     */
    function estimateRent(Rentings.Params calldata params) external view returns (RentalFees memory) {
        // Validate renting parameters.
        (Listings.Listing storage listing, Warpers.Warper storage warper) = _validateRentingParams(params);
        return _calculateRentalFees(listing.asset, warper, listing.params, params);
    }

    /**
     * @dev Main renting request validation function.
     */
    function _validateRentingParams(Rentings.Params calldata params)
        internal
        view
        returns (Listings.Listing storage listing, Warpers.Warper storage warper)
    {
        // Validate from the protocol perspective.
        _protocol.checkBaseToken(params.paymentToken);

        // Validate from the listing perspective.
        _listingRegistry.checkListed(params.listingId);
        listing = _listingRegistry.listings[params.listingId];
        listing.checkNotPaused();
        listing.checkValidLockPeriod(params.rentalPeriod);

        // Validate from the original asset perspective.
        _assetRegistry.checkCompatibleWarper(listing.asset.id, params.warper);

        // Validate from the warper perspective.
        warper = _warperRegistry.warpers[params.warper];
        warper.checkNotPaused();
        warper.controller.validateRentingParams(listing.asset, params);
    }

    /**
     * @inheritdoc IRentingManager
     */
    function rent(Rentings.Params calldata rentingParams, uint256 maxPaymentAmount) external returns (uint256) {
        // Currently payer must match the renter address since the estimation might be renter specific.
        address payer = _msgSender();
        if (payer != rentingParams.renter) revert CallerIsNotRenter();

        // Validate renting parameters.
        (Listings.Listing storage listing, Warpers.Warper storage warper) = _validateRentingParams(rentingParams);
        Assets.Asset memory listedAsset = listing.asset;

        // Handle payments.
        _handleRentalPayment(
            _calculateRentalFees(listedAsset, warper, listing.params, rentingParams),
            listing.lister,
            warper.universeId,
            payer,
            rentingParams.paymentToken,
            maxPaymentAmount
        );

        // Warp the asset!
        (bytes32 collectionId, Assets.Asset memory warpedAsset) = abi.decode(
            address(warper.controller).functionDelegateCall(
                abi.encodeWithSelector(
                    IWarperController.warp.selector,
                    listedAsset,
                    rentingParams.warper,
                    rentingParams.renter
                )
            ),
            (bytes32, Assets.Asset)
        );

        // Register new rental agreement.
        uint32 blockTimestamp = uint32(block.timestamp);
        Rentings.Agreement memory rentalAgreement = Rentings.Agreement({
            warpedAsset: warpedAsset,
            collectionId: collectionId,
            listingId: rentingParams.listingId,
            renter: rentingParams.renter,
            startTime: blockTimestamp,
            endTime: blockTimestamp + rentingParams.rentalPeriod
        });

        // Register new rental agreement.
        uint256 rentalId = _rentingRegistry.register(rentalAgreement);

        // Update listing lock time.
        _listingRegistry.listings[rentingParams.listingId].addLock(rentalAgreement.endTime);

        //todo: clean up x2 expired rental agreements
        // todo: emit AssetRented event

        return rentalId;
    }

    /**
     * @dev Transfers rental payments.
     */
    function _handleRentalPayment(
        RentalFees memory fees,
        address lister,
        uint256 universeId,
        address payer,
        address paymentToken,
        uint256 maxPaymentAmount
    ) internal {
        // Ensure no rental fee payment slippage.
        if (fees.total > maxPaymentAmount) revert RentalFeeSlippage();

        // Transfer the lister fee part directly to the lister account.
        uint256 listerFee = fees.listerBaseFee + fees.listerPremium;
        IERC20Upgradeable(paymentToken).safeTransferFrom(payer, lister, listerFee);

        // Transfer the remaining part of the fees to the metahub and split between the universe and the protocol.
        uint256 accumulatedFees = fees.total - listerFee;
        IERC20Upgradeable(paymentToken).safeTransferFrom(payer, address(this), accumulatedFees);

        // Increase universe balance.
        uint256 universeFee = fees.universeBaseFee + fees.universePremium;
        _accountRegistry.universes[universeId].increaseBalance(paymentToken, universeFee);

        // Increase protocol balance.
        _accountRegistry.protocol.increaseBalance(paymentToken, fees.protocolFee);
        // todo: event with balance changes;
    }

    /**
     * @inheritdoc IRentingManager
     */
    function collectionRentedValue(bytes32 warpedCollectionId, address renter) external view returns (uint256) {
        return _rentingRegistry.collectionRentedValue(renter, warpedCollectionId);
    }

    /**
     * @inheritdoc IRentingManager
     */
    function assetRentalStatus(Assets.AssetId calldata warpedAssetId) external view returns (Rentings.RentalStatus) {
        return _rentingRegistry.assetRentalStatus(warpedAssetId);
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
    function setUniverseName(uint256 universeId, string memory universeName) external onlyUniverseOwner(universeId) {
        _universeRegistry.token.setUniverseName(universeId, universeName);
    }

    /**
     * @inheritdoc IUniverseManager
     */
    function universe(uint256 universeId)
        external
        view
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
        warper = _deployWarperWithData(original, presetId, new bytes(0));
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
        warper = _deployWarperWithData(original, presetId, presetData);
        _registerWarper(universeId, warper, true);
    }

    /**
     * @inheritdoc IListingManager
     */
    function listAsset(
        Assets.Asset calldata asset,
        Listings.Params calldata params,
        uint32 maxLockPeriod
    ) external returns (uint256) {
        // Check that listing asset is supported.
        _assetRegistry.checkAssetSupport(asset.token());

        // Check that listing strategy is supported.
        _listingRegistry.checkListingStrategySupport(params.strategy);

        // Transfer asset from lister account to the vault.
        _assetRegistry.transferAssetToVault(asset, _msgSender());

        // Register listing.
        Listings.Listing memory listing = Listings.Listing(_msgSender(), asset, params, maxLockPeriod, 0, false, false);
        uint256 listingId = _listingRegistry.register(listing);

        emit AssetListed(listingId, listing.lister, listing.asset, listing.params, listing.maxLockPeriod);

        return listingId;
    }

    /**
     * @inheritdoc IListingManager
     */
    function delistAsset(uint256 listingId) external listed(listingId) onlyLister(listingId) {
        Listings.Listing storage listing = _listingRegistry.listings[listingId];
        listing.delisted = true;
        emit AssetDelisted(listingId, listing.lister, listing.lockedTill);
    }

    /**
     * @inheritdoc IListingManager
     */
    function withdrawAsset(uint256 listingId) external onlyLister(listingId) {
        Listings.Listing memory listing = _listingRegistry.listings[listingId];
        // Check whether the asset can be returned to the owner.
        if (uint32(block.timestamp) < listing.lockedTill) revert AssetIsLocked();

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
    function listingInfo(uint256 listingId) external view returns (Listings.Listing memory) {
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
    function warperInfo(address warper) external view registeredWarper(warper) returns (Warpers.Warper memory) {
        return _warperRegistry.warpers[warper];
    }

    /**
     * @inheritdoc IWarperManager
     */
    function warperController(address warper) external view returns (address) {
        return address(_warperRegistry.warpers[warper].controller);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function withdrawProtocolFunds(
        address token,
        uint256 amount,
        address to
    ) external onlyAdmin {
        _accountRegistry.protocol.withdraw(token, amount, to);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function withdrawUniverseFunds(
        uint256 universeId,
        address token,
        uint256 amount,
        address to
    ) external onlyUniverseOwner(universeId) {
        _accountRegistry.universes[universeId].withdraw(token, amount, to);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function baseToken() external view returns (address) {
        return address(_protocol.baseToken);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function protocolBalance(address token) public view returns (uint256) {
        return _accountRegistry.protocol.balance(token);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function protocolBalances() external view returns (Accounts.Balance[] memory) {
        return _accountRegistry.protocol.balances();
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function universeBalance(uint256 universeId, address token) public view returns (uint256) {
        return _accountRegistry.universes[universeId].balance(token);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function universeBalances(uint256 universeId) external view returns (Accounts.Balance[] memory) {
        return _accountRegistry.universes[universeId].balances();
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
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

        // Check that warper has correct metahub reference.
        address warperMetahub = IWarper(warper).__metahub();
        if (warperMetahub != address(this)) revert WarperHasIncorrectMetahubReference(warperMetahub, address(this));

        IWarperController controller = IWarperController(_assetRegistry.assetClassController(assetClass));

        // Register warper.
        _warperRegistry.register(
            warper,
            Warpers.Warper({universeId: universeId, controller: controller, paused: paused})
        );

        // Register the original asset if it is seen for the first time.
        address original = IWarper(warper).__original();
        if (!_assetRegistry.isRegisteredAsset(original)) {
            _assetRegistry.addAsset(assetClass, original);
            // todo: emit event AssetRegistered(asset);
        }
        // Associate the original asset with the the warper.
        _assetRegistry.addAssetWarper(original, warper);

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
    function _calculateRentalFees(
        Assets.Asset memory asset,
        Warpers.Warper memory warper,
        Listings.Params memory listingParams,
        Rentings.Params memory rentingParams
    ) internal view returns (RentalFees memory) {
        // Calculate lister base fee.
        // Resolve listing controller to calculate lister fee based on selected listing strategy.
        IListingController listingController = _listingRegistry.listingController(listingParams.strategy);
        uint256 listerBaseFee = listingController.calculateRentalFee(listingParams, rentingParams);

        // Calculate universe base fee.
        uint16 universeRentalFeePercent = _universeRegistry.universes[warper.universeId].rentalFeePercent;
        uint256 universeBaseFee = (listerBaseFee * universeRentalFeePercent) / 10_000;

        // Calculate protocol fee.
        uint256 protocolFee = (listerBaseFee * _protocol.rentalFeePercent) / 10_000;

        // Calculate warper premiums.
        (uint256 universePremium, uint256 listerPremium) = warper.controller.calculatePremiums(
            asset,
            rentingParams,
            universeBaseFee,
            listerBaseFee
        );

        return
            RentalFees({
                listerBaseFee: listerBaseFee,
                listerPremium: listerPremium,
                universeBaseFee: universeBaseFee,
                universePremium: universePremium,
                protocolFee: protocolFee,
                total: listerBaseFee + listerPremium + universeBaseFee + universePremium + protocolFee
            });
    }
}
