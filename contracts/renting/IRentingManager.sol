// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./Rentings.sol";

interface IRentingManager {
    /**
     * @dev Thrown when the message sender doesn't match the renter address.
     */
    error CallerIsNotRenter();

    /**
     * @dev Emitted when the warped asset is rented.
     * @param rentalId Rental agreement ID.
     * @param renter The renter account address.
     * @param listingId The corresponding ID of the original asset listing.
     * @param warpedAsset Rented warped asset.
     * @param startTime The rental agreement staring time.
     * @param endTime The rental agreement ending time.
     */
    event AssetRented(
        uint256 indexed rentalId,
        address indexed renter,
        uint256 indexed listingId,
        Assets.Asset warpedAsset,
        uint32 startTime,
        uint32 endTime
    );

    /**
     * @dev Returns token amount from specific collection rented by particular account.
     * @param warpedCollectionId Warped collection ID.
     * @param renter The renter account address.
     * @return Rented value.
     */
    function collectionRentedValue(bytes32 warpedCollectionId, address renter) external view returns (uint256);

    /**
     * @dev Returns the rental status of a given warped asset.
     * @param warpedAssetId Warped asset ID.
     * @return The asset rental status.
     */
    function assetRentalStatus(Assets.AssetId calldata warpedAssetId) external view returns (Rentings.RentalStatus);

    /**
     * @dev Evaluates renting params and returns rental fee breakdown.
     * @param rentingParams Renting parameters.
     * @return Rental fee breakdown.
     */
    function estimateRent(Rentings.Params calldata rentingParams) external view returns (Rentings.RentalFees memory);

    /**
     * @dev Performs renting operation.
     * @param rentingParams Renting parameters.
     * @param maxPaymentAmount Maximal payment amount the renter is willing to pay.
     * @return New rental ID.
     */
    function rent(Rentings.Params calldata rentingParams, uint256 maxPaymentAmount) external returns (uint256);

    /**
     * @dev Returns the rental agreement details.
     * @param rentalId Rental agreement ID.
     * @return Rental agreement details.
     */
    function rentalAgreementInfo(uint256 rentalId) external view returns (Rentings.Agreement memory);

    /**
     * @dev Returns the number of currently registered rental agreements for particular renter account.
     * @param renter Renter address.
     * @return Rental agreement count.
     */
    function userRentalCount(address renter) external view returns (uint256);

    /**
     * @dev Returns the paginated list of currently registered rental agreements for particular renter account.
     * @param renter Renter address.
     * @param offset Starting index.
     * @param limit Max number of items.
     * @return Rental agreement IDs.
     * @return Rental agreements.
     */
    function userRentalAgreements(
        address renter,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory, Rentings.Agreement[] memory);
}
