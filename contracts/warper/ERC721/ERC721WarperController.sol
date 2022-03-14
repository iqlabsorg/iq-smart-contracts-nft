// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../../asset/ERC721/ERC721AssetController.sol";
import "../IWarperController.sol";
import "./IERC721Warper.sol";
import "../mechanics/asset-rentability/IAssetRentabilityMechanics.sol";
import "../mechanics/availability-period/IAvailabilityPeriodMechanics.sol";
import "../mechanics/rental-fee-premium/IRentalFeePremiumMechanics.sol";
import "../mechanics/rental-period/IRentalPeriodMechanics.sol";

contract ERC721WarperController is IWarperController, ERC721AssetController {
    /**
     * @dev Thrown when the current time is not withing the warper availability period.
     */
    error WarperIsNotAvailableForRenting(
        uint256 currentTime,
        uint32 availabilityPeriodStart,
        uint32 availabilityPeriodEnd
    );

    /**
     * @dev Thrown when the requested rental period is not withing the warper allowed rental period range.
     */
    error WarperRentalPeriodIsOutOfRange(uint32 requestedRentalPeriod, uint32 minRentalPeriod, uint32 maxRentalPeriod);

    /**
     * @inheritdoc IWarperController
     */
    function isCompatibleWarper(IWarper warper) external view returns (bool) {
        return warper.supportsInterface(type(IERC721Warper).interfaceId);
    }

    /**
     * @inheritdoc IWarperController
     */
    function validateRentingRequest(Assets.Asset calldata asset, Rentings.Params calldata rentingParams) external view {
        address warper = rentingParams.warper;

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
                revert WarperIsNotAvailableForRenting(block.timestamp, start, end);
            }
        }

        // Handle rental period mechanics.
        if (supportedMechanics[1]) {
            (uint32 min, uint32 max) = IRentalPeriodMechanics(warper).__rentalPeriodRange();
            if (rentingParams.rentalPeriod < min || rentingParams.rentalPeriod > max) {
                revert WarperRentalPeriodIsOutOfRange(rentingParams.rentalPeriod, min, max);
            }
        }

        // Handle asset rentability mechanics.
        if (supportedMechanics[2]) {
            (, uint256 tokenId) = _decodeAssetId(asset.id);
            (bool isRentable, string memory errorMessage) = IAssetRentabilityMechanics(warper).isRentableAsset(
                rentingParams.renter,
                tokenId,
                1
            );
            if (!isRentable) revert AssetIsNotRentable(errorMessage);
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
        if (IWarper(rentingParams.warper).supportsInterface(type(IRentalFeePremiumMechanics).interfaceId)) {
            (, uint256 tokenId) = _decodeAssetId(asset.id);
            return
                IRentalFeePremiumMechanics(rentingParams.warper).calculatePremiums(
                    rentingParams.renter,
                    tokenId,
                    1,
                    rentingParams.rentalPeriod,
                    universeFee,
                    listerFee
                );
        }
        return (0, 0);
    }
}
