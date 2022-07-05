// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../acl/AccessControlledUpgradeable.sol";
import "./IMetahub.sol";
import "./MetahubStorage.sol";

contract Metahub is IMetahub, Initializable, UUPSUpgradeable, AccessControlledUpgradeable, MetahubStorage {
    using Address for address;
    using Accounts for Accounts.Account;
    using Accounts for Accounts.Registry;
    using Assets for Assets.Asset;
    using Assets for Assets.Registry;
    using Listings for Listings.Listing;
    using Listings for Listings.Registry;
    using Rentings for Rentings.Registry;
    using Warpers for Warpers.Warper;
    using Warpers for Warpers.Registry;

    /**
     * @dev Metahub initialization params.
     * @param warperPresetFactory Warper preset factory address.
     * @param listingStrategyRegistry
     * @param universeRegistry
     * @param acl
     * @param baseToken
     * @param rentalFeePercent
     */
    struct MetahubInitParams {
        IWarperManager warperManager;
        IListingStrategyRegistry listingStrategyRegistry;
        IUniverseRegistry universeRegistry;
        IACL acl;
        IERC20Upgradeable baseToken;
        uint16 rentalFeePercent;
    }

    /**
     * @dev Modifier to make a function callable only by the universe owner.
     */
    modifier onlyUniverseOwner(uint256 universeId) {
        _universeRegistry.checkUniverseOwner(universeId, _msgSender());
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
     * @dev Modifier to make sure the function is called for a listing that has been registered.
     */
    modifier listingExists(uint256 listingId) {
        _listingRegistry.checkRegisteredListing(listingId);
        _;
    }

    /**
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Metahub initializer.
     * @param params Initialization params.
     */
    function initialize(MetahubInitParams calldata params) external initializer {
        __UUPSUpgradeable_init();

        _aclContract = params.acl;
        _protocolConfig = Protocol.Config({baseToken: params.baseToken, rentalFeePercent: params.rentalFeePercent});

        _warperManager = params.warperManager;
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
     * @inheritdoc IListingManager
     */
    function listAsset(
        Assets.Asset calldata asset,
        Listings.Params calldata params,
        uint32 maxLockPeriod,
        bool immediatePayout
    ) external returns (uint256) {
        // Check that asset is supported.
        _warperManager.checkSupportedAsset(asset.token());

        // Check that listing strategy is supported.
        _listingRegistry.checkSupportedListingStrategy(params.strategy);

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

        // Transfer asset from lister account to the vault.
        _assetRegistry.transferAssetToVault(asset, _msgSender());

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
     * @inheritdoc IRentingManager
     */
    function rent(Rentings.Params calldata rentingParams, uint256 maxPaymentAmount) external returns (uint256) {
        // Validate renting parameters.
        Rentings.validateRentingParams(rentingParams, _protocolConfig, _listingRegistry, _warperManager);

        // Warp the asset and deliver to to the renter.
        (bytes32 warpedCollectionId, Assets.Asset memory warpedAsset) = _warpListedAsset(
            rentingParams.listingId,
            rentingParams.warper,
            rentingParams.renter
        );

        // Register new rental agreement.
        uint32 blockTimestamp = uint32(block.timestamp);
        Rentings.Agreement memory rentalAgreement = Rentings.Agreement({
            warpedAsset: warpedAsset,
            collectionId: warpedCollectionId,
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
        _rentingRegistry.deleteExpiredUserRentalAgreements(rentingParams.renter, warpedCollectionId, 2);

        // Handle rental payments.
        Accounts.RentalEarnings memory rentalEarnings = _handleRentalPayment(
            rentingParams,
            _msgSender(),
            maxPaymentAmount
        );

        // Execute rental hook.
        _executeWarperRentalHook(rentingParams.warper, rentalId, rentalAgreement, rentalEarnings);

        emit AssetRented(
            rentalId,
            rentalAgreement.renter,
            rentalAgreement.listingId,
            rentalAgreement.warpedAsset,
            rentalAgreement.startTime,
            rentalAgreement.endTime
        );

        return rentalId;
    }

    /**
     * @inheritdoc IProtocolConfigManager
     */
    function warperManager() external view returns (IWarperManager) {
        return _warperManager;
    }

    /**
     * @inheritdoc IRentingManager
     */
    function estimateRent(Rentings.Params calldata rentingParams) external view returns (Rentings.RentalFees memory) {
        Rentings.validateRentingParams(rentingParams, _protocolConfig, _listingRegistry, _warperManager);
        return
            Rentings.calculateRentalFees(
                rentingParams,
                _protocolConfig,
                _listingRegistry,
                _warperManager,
                _universeRegistry
            );
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
    function rentalAgreementInfo(uint256 rentalId) external view returns (Rentings.Agreement memory) {
        return _rentingRegistry.agreements[rentalId];
    }

    /**
     * @inheritdoc IRentingManager
     */
    function userRentalCount(address renter) external view returns (uint256) {
        return _rentingRegistry.userRentalCount(renter);
    }

    /**
     * @inheritdoc IRentingManager
     */
    function userRentalAgreements(
        address renter,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory, Rentings.Agreement[] memory) {
        return _rentingRegistry.userRentalAgreements(renter, offset, limit);
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
     * @inheritdoc IListingManager
     */
    function listingInfo(uint256 listingId) external view listingExists(listingId) returns (Listings.Listing memory) {
        return _listingRegistry.listings[listingId];
    }

    /**
     * @inheritdoc IListingManager
     */
    function listingCount() external view returns (uint256) {
        return _listingRegistry.listingCount();
    }

    /**
     * @inheritdoc IListingManager
     */
    function listings(uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory, Listings.Listing[] memory)
    {
        return _listingRegistry.allListings(offset, limit);
    }

    /**
     * @inheritdoc IListingManager
     */
    function userListingCount(address lister) external view returns (uint256) {
        return _listingRegistry.userListingCount(lister);
    }

    /**
     * @inheritdoc IListingManager
     */
    function userListings(
        address lister,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory, Listings.Listing[] memory) {
        return _listingRegistry.userListings(lister, offset, limit);
    }

    /**
     * @inheritdoc IListingManager
     */
    function assetListingCount(address original) external view returns (uint256) {
        return _listingRegistry.assetListingCount(original);
    }

    /**
     * @inheritdoc IListingManager
     */
    function assetListings(
        address original,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory, Listings.Listing[] memory) {
        return _listingRegistry.assetListings(original, offset, limit);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function protocolBalance(address token) external view returns (uint256) {
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
    function universeBalance(uint256 universeId, address token) external view returns (uint256) {
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
    function balance(address account, address token) external view returns (uint256) {
        return _accountRegistry.users[account].balance(token);
    }

    /**
     * @inheritdoc IPaymentManager
     */
    function balances(address account) external view returns (Accounts.Balance[] memory) {
        return _accountRegistry.users[account].balances();
    }

    /**
     * @inheritdoc UUPSUpgradeable
     * @dev Checks whether the caller is authorized to upgrade the Metahub implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        // solhint-disable-previous-line no-empty-blocks
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
        address controller = _warperManager.warperController(warper);
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
    ) internal returns (Accounts.RentalEarnings memory rentalEarnings) {
        // Get precise estimation.
        Rentings.RentalFees memory fees = Rentings.calculateRentalFees(
            rentingParams,
            _protocolConfig,
            _listingRegistry,
            _warperManager,
            _universeRegistry
        );

        rentalEarnings = _accountRegistry.handleRentalPayment(
            rentingParams,
            fees,
            payer,
            maxPaymentAmount,
            _warperManager,
            _listingRegistry
        );

        // Emit events
        for (uint256 i = 0; i < rentalEarnings.userEarnings.length; i++) {
            Accounts.UserEarning memory userEarning = rentalEarnings.userEarnings[i];
            emit UserEarned(userEarning.account, userEarning.earningType, userEarning.token, userEarning.value);
        }

        emit UniverseEarned(
            rentalEarnings.universeId,
            rentalEarnings.universeEarningToken,
            rentalEarnings.universeEarningValue
        );
        emit ProtocolEarned(rentalEarnings.protocolEarningToken, rentalEarnings.protocolEarningValue);
    }

    /**
     * @dev Executes warper rental hook using the corresponding controller.
     * @param warper Warper address.
     * @param rentalId Rental Agreement ID.
     * @param rentalAgreement Newly registered rental agreement details.
     * @param rentalEarnings The rental earnings breakdown.
     */
    function _executeWarperRentalHook(
        address warper,
        uint256 rentalId,
        Rentings.Agreement memory rentalAgreement,
        Accounts.RentalEarnings memory rentalEarnings
    ) internal {
        address controller = _warperManager.warperController(warper);

        controller.functionDelegateCall(
            abi.encodeWithSelector(
                IWarperController.executeRentingHooks.selector,
                rentalId,
                rentalAgreement,
                rentalEarnings
            )
        );
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }
}
