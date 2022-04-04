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
import "../universe/IUniverseRegistry.sol";
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
        IUniverseRegistry universeRegistry;
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
        _protocolConfig = Protocol.Config({baseToken: params.baseToken, rentalFeePercent: params.rentalFeePercent});

        _warperRegistry.presetFactory = params.warperPresetFactory;
        _assetRegistry.classRegistry = params.assetClassRegistry;
        _listingRegistry.strategyRegistry = params.listingStrategyRegistry;
        _universeRegistry = params.universeRegistry;
    }

    /**
     * @inheritdoc IProtocolConfigManager
     */
    function setProtocolRentalFeePercent(uint16 rentalFeePercent) external onlyAdmin {
        _protocolConfig.rentalFeePercent = rentalFeePercent;
        emit ProtocolRentalFeeChanged(rentalFeePercent);
    }

    /**
     * @inheritdoc IProtocolConfigManager
     */
    function protocolRentalFeePercent() external view returns (uint16) {
        return _protocolConfig.rentalFeePercent;
    }

    /**
     * @inheritdoc IProtocolConfigManager
     */
    function baseToken() external view returns (address) {
        return address(_protocolConfig.baseToken);
    }

    /**
     * @inheritdoc IRentingManager
     */
    function estimateRent(Rentings.Params calldata rentingParams) external view returns (Rentings.RentalFees memory) {
        _validateRentingParams(rentingParams);
        return _calculateRentalFees(rentingParams);
    }

    /**
     * @dev Main renting request validation function.
     */
    function _validateRentingParams(Rentings.Params calldata params) internal view {
        // Validate from the protocol perspective.
        _protocolConfig.checkBaseToken(params.paymentToken);

        // Validate from the listing perspective.
        _listingRegistry.checkListed(params.listingId);
        Listings.Listing storage listing = _listingRegistry.listings[params.listingId];
        listing.checkNotPaused();
        listing.checkValidLockPeriod(params.rentalPeriod);

        // Validate from the original asset perspective.
        _assetRegistry.checkCompatibleWarper(listing.asset.id, params.warper);

        // Validate from the warper perspective.
        Warpers.Warper storage warper = _warperRegistry.warpers[params.warper];
        warper.checkNotPaused();
        warper.controller.validateRentingParams(listing.asset, params);
    }

    /**
     * @inheritdoc IRentingManager
     */
    function rent(Rentings.Params calldata rentingParams, uint256 maxPaymentAmount) external returns (uint256) {
        // Currently payer must match the renter address since the estimation might be renter specific.
        if (_msgSender() != rentingParams.renter) revert CallerIsNotRenter();

        // Validate renting parameters.
        _validateRentingParams(rentingParams);

        // Handle payments.
        _handleRentalPayment(rentingParams, _msgSender(), maxPaymentAmount);

        // Deliver warper asset to the renter!
        (bytes32 collectionId, Assets.Asset memory warpedAsset) = _warpListedAsset(
            rentingParams.listingId,
            rentingParams.warper,
            rentingParams.renter
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

        // Clean up x2 expired rental agreements.
        _rentingRegistry.deleteExpiredUserRentalAgreements(rentingParams.renter, collectionId, 2);

        // todo: emit AssetRented event

        return rentalId;
    }

    /**
     * @inheritdoc IRentingManager
     */
    function rentalAgreementInfo(uint256 rentalId) external view returns (Rentings.Agreement memory) {
        return _rentingRegistry.agreements[rentalId];
    }

    /**
     * @dev Finds the listed asset and warps it, using corresponding warper controller.
     * @param listingId Listing ID.
     * @param warper Warper address.
     * @param renter Renter address.
     * @return collectionId Warped collection ID.
     * @return warpedAsset Warped asset structure.
     */
    function _warpListedAsset(
        uint256 listingId,
        address warper,
        address renter
    ) internal returns (bytes32 collectionId, Assets.Asset memory warpedAsset) {
        Assets.Asset memory asset = _listingRegistry.listings[listingId].asset;
        address controller = address(_warperRegistry.warpers[warper].controller);
        (collectionId, warpedAsset) = abi.decode(
            controller.functionDelegateCall(
                abi.encodeWithSelector(IWarperController.warp.selector, asset, warper, renter)
            ),
            (bytes32, Assets.Asset)
        );
    }

    /**
     * @dev Handles all rental payments.
     */
    function _handleRentalPayment(
        Rentings.Params calldata rentingParams,
        address payer,
        uint256 maxPaymentAmount
    ) internal {
        // Get precise estimation.
        Rentings.RentalFees memory fees = _calculateRentalFees(rentingParams);
        address paymentToken = rentingParams.paymentToken;

        // Ensure no rental fee payment slippage.
        if (fees.total > maxPaymentAmount) revert RentalFeeSlippage();

        // The amount of payment tokens to be accumulated on the Metahub for future payouts.
        // This will include all fees which are not being paid out immediately.
        uint256 accumulatedTokens = 0;

        // Handle lister fee component.
        Listings.Listing storage listing = _listingRegistry.listings[rentingParams.listingId];
        uint256 listerFee = fees.listerBaseFee + fees.listerPremium;
        // If lister requested immediate payouts, transfer the lister fee part directly to the lister account.
        // Otherwise increase the lister balance.
        address lister = listing.lister;
        if (listing.immediatePayout) {
            IERC20Upgradeable(paymentToken).safeTransferFrom(payer, lister, listerFee);
        } else {
            _accountRegistry.users[lister].increaseBalance(paymentToken, listerFee);
            accumulatedTokens += listerFee;
        }

        // Handle universe fee component.
        uint256 universeId = _warperRegistry.warpers[rentingParams.warper].universeId;
        uint256 universeFee = fees.universeBaseFee + fees.universePremium;
        // Increase universe balance.
        _accountRegistry.universes[universeId].increaseBalance(paymentToken, universeFee);
        accumulatedTokens += universeFee;

        // Handle protocol fee component.
        _accountRegistry.protocol.increaseBalance(paymentToken, fees.protocolFee);
        accumulatedTokens += fees.protocolFee;

        // Transfer the accumulated token amount from payer to the metahub.
        IERC20Upgradeable(paymentToken).safeTransferFrom(payer, address(this), accumulatedTokens);
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
     * @inheritdoc IWarperManager
     */
    function registerWarper(address warper, uint256 universeId) external onlyUniverseOwner(universeId) {
        _registerWarper(universeId, warper, false);
    }

    /**
     * @inheritdoc IListingManager
     */
    function listAsset(
        Assets.Asset calldata asset,
        Listings.Params calldata params,
        uint32 maxLockPeriod,
        bool immediatePayout
    ) external returns (uint256) {
        // Check that listing asset is supported.
        _assetRegistry.checkAssetSupport(asset.token());

        // Check that listing strategy is supported.
        _listingRegistry.checkListingStrategySupport(params.strategy);

        // Transfer asset from lister account to the vault.
        _assetRegistry.transferAssetToVault(asset, _msgSender());

        // Register listing.
        Listings.Listing memory listing = Listings.Listing({
            asset: asset,
            params: params,
            lister: _msgSender(),
            maxLockPeriod: maxLockPeriod,
            lockedTill: 0,
            immediatePayout: immediatePayout,
            delisted: false,
            paused: false
        });
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
    function withdrawFunds(
        address token,
        uint256 amount,
        address to
    ) external {
        _accountRegistry.users[_msgSender()].withdraw(token, amount, to);
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
     * @inheritdoc IPaymentManager
     */
    function balance(address token) external view returns (uint256) {
        return _accountRegistry.users[_msgSender()].balance(token);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function balances() external view returns (Accounts.Balance[] memory) {
        return _accountRegistry.users[_msgSender()].balances();
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
    function _calculateRentalFees(Rentings.Params calldata rentingParams)
        internal
        view
        returns (Rentings.RentalFees memory)
    {
        // Calculate lister base fee.
        Listings.Listing storage listing = _listingRegistry.listings[rentingParams.listingId];
        Listings.Params memory listingParams = listing.params;
        // Resolve listing controller to calculate lister fee based on selected listing strategy.
        IListingController listingController = _listingRegistry.listingController(listingParams.strategy);
        uint256 listerBaseFee = listingController.calculateRentalFee(listingParams, rentingParams);

        // Calculate universe base fee.
        Warpers.Warper storage warper = _warperRegistry.warpers[rentingParams.warper];
        uint16 universeRentalFeePercent = _universeRegistry.universeFeePercent(warper.universeId);
        uint256 universeBaseFee = (listerBaseFee * universeRentalFeePercent) / 10_000;

        // Calculate protocol fee.
        uint256 protocolFee = (listerBaseFee * _protocolConfig.rentalFeePercent) / 10_000;

        // Calculate warper premiums.
        (uint256 universePremium, uint256 listerPremium) = warper.controller.calculatePremiums(
            listing.asset,
            rentingParams,
            universeBaseFee,
            listerBaseFee
        );

        // Calculate TOTAL rental fee.
        uint256 total = listerBaseFee + listerPremium + universeBaseFee + universePremium + protocolFee;

        return
            Rentings.RentalFees({
                total: total,
                protocolFee: protocolFee,
                listerBaseFee: listerBaseFee,
                listerPremium: listerPremium,
                universeBaseFee: universeBaseFee,
                universePremium: universePremium
            });
    }
}
