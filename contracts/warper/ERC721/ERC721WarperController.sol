// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../../asset/ERC721/ERC721AssetController.sol";
import "../../renting/IRentingManager.sol";
import "../mechanics/availability-period/IAvailabilityPeriodMechanics.sol";
import "../mechanics/rental-period/IRentalPeriodMechanics.sol";
import "../mechanics/asset-rentability/IAssetRentabilityMechanics.sol";
import "../mechanics/rental-fee-premium/IRentalFeePremiumMechanics.sol";
import "./IERC721WarperController.sol";
import "./IERC721Warper.sol";

contract ERC721WarperController is IERC721WarperController, ERC721AssetController {
    using Assets for Assets.Asset;

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AssetController, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC721WarperController).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IWarperController
     */
    function isCompatibleWarper(address warper) public view returns (bool) {
        return IWarper(warper).supportsInterface(type(IERC721Warper).interfaceId);
    }

    /**
     * @inheritdoc IWarperController
     */
    function checkCompatibleWarper(address warper) external view {
        if (!isCompatibleWarper(warper)) revert IncompatibleWarperInterface();
    }

    /**
     * @inheritdoc IWarperController
     */
    function validateRentingParams(Assets.Asset calldata asset, Rentings.Params calldata rentingParams) external view {
        _validateAsset(asset);

        // Ensure the warped asset is not rented.
        address warper = rentingParams.warper;
        (, uint256 tokenId) = _decodeAssetId(asset.id);
        if (rentalStatus(IWarper(warper).__metahub(), warper, tokenId) == Rentings.RentalStatus.RENTED) {
            revert AlreadyRented();
        }

        // Analyse warper functionality by checking the supported mechanics.
        bytes4[] memory mechanics = new bytes4[](3);
        mechanics[0] = type(IAvailabilityPeriodMechanics).interfaceId;
        mechanics[1] = type(IRentalPeriodMechanics).interfaceId;
        mechanics[2] = type(IAssetRentabilityMechanics).interfaceId;
        bool[] memory supportedMechanics = IWarper(warper).__supportedInterfaces(mechanics);

        // Handle availability period mechanics.
        if (supportedMechanics[0]) {
            (uint32 start, uint32 end) = IAvailabilityPeriodMechanics(warper).__availabilityPeriodRange();
            if (block.timestamp < start || block.timestamp > end) {
                revert IAvailabilityPeriodMechanics.WarperIsNotAvailableForRenting(block.timestamp, start, end);
            }
        }

        // Handle rental period mechanics.
        if (supportedMechanics[1]) {
            (uint32 min, uint32 max) = IRentalPeriodMechanics(warper).__rentalPeriodRange();
            if (rentingParams.rentalPeriod < min || rentingParams.rentalPeriod > max) {
                revert IRentalPeriodMechanics.WarperRentalPeriodIsOutOfRange(rentingParams.rentalPeriod, min, max);
            }
        }

        // Handle asset rentability mechanics.
        if (supportedMechanics[2]) {
            (bool isRentable, string memory errorMessage) = IAssetRentabilityMechanics(warper).isRentableAsset(
                rentingParams.renter,
                tokenId,
                asset.value
            );
            if (!isRentable) revert IAssetRentabilityMechanics.AssetIsNotRentable(errorMessage);
        }
    }

    /**
     * @inheritdoc IWarperController
     */
    function calculatePremiums(
        Assets.Asset calldata asset,
        Rentings.Params calldata rentingParams,
        uint256 universeFee,
        uint256 listerFee
    ) external view returns (uint256 universePremium, uint256 listerPremium) {
        _validateAsset(asset);
        if (IWarper(rentingParams.warper).supportsInterface(type(IRentalFeePremiumMechanics).interfaceId)) {
            (, uint256 tokenId) = _decodeAssetId(asset.id);
            return
                IRentalFeePremiumMechanics(rentingParams.warper).calculatePremiums(
                    rentingParams.renter,
                    tokenId,
                    asset.value,
                    rentingParams.rentalPeriod,
                    universeFee,
                    listerFee
                );
        }
        return (0, 0);
    }

    /**
     * @inheritdoc IWarperController
     * @dev Needs to be called with `delegatecall` from Metahub,
     * otherwise warpers will reject the call.
     */
    function warp(
        Assets.Asset calldata asset,
        address warper,
        address to
    ) external onlyDelegatecall returns (bytes32 collectionId, Assets.Asset memory warpedAsset) {
        _validateAsset(asset);
        (address original, uint256 tokenId) = _decodeAssetId(asset.id);
        // Make sure the correct warper is used for the asset.
        if (original != IWarper(warper).__original()) revert InvalidAssetForWarper(warper, original);

        // Encode warped asset. The tokenId of the warped asset is identical to the original one,
        // but the address is changed to warper contract.
        warpedAsset = Assets.Asset(_encodeAssetId(warper, tokenId), asset.value);
        collectionId = _collectionId(warper);

        // If the warped asset has never been rented before, create new instance, otherwise transfer existing one.
        if (rentalStatus(address(this), warper, tokenId) == Rentings.RentalStatus.NONE) {
            IERC721Warper(warper).mint(to, tokenId, new bytes(0));
        } else {
            _transferAsset(warpedAsset, address(this), to, new bytes(0));
        }
    }

    /**
     * @inheritdoc IERC721WarperController
     */
    function rentalBalance(
        address metahub,
        address warper,
        address renter
    ) public view returns (uint256) {
        return IRentingManager(metahub).collectionRentedValue(_collectionId(warper), renter);
    }

    /**
     * @inheritdoc IERC721WarperController
     */
    function rentalStatus(
        address metahub,
        address warper,
        uint256 tokenId
    ) public view returns (Rentings.RentalStatus) {
        return IRentingManager(metahub).assetRentalStatus(_encodeAssetId(warper, tokenId));
    }
}
