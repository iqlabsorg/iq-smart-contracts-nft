// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./Rentings.sol";

interface IRentingManager {
    /**
     * @dev Thrown when the estimated rental fee calculated upon renting
     * is higher than maximal payment amount the renter is willing to pay.
     */
    error RentalPriceSlippage();

    /**
     * @dev Thrown when the message sender doesn't match the renter address.
     */
    error CallerIsNotRenter();

    enum WarperRentalStatus {
        NOT_MINTED,
        MINTED,
        RENTED
    }

    /**
     * @dev Get the amount of currently active rentals for a given user for a warper.
     * @param warper Warper address.
     * @param account Account address.
     * @return Amount of active rentals.
     */
    function getActiveWarperRentalCount(address warper, address account) external view returns (uint256);

    /**
     * @dev Get the rental status for a token on a given warper.
     * @param warper Warper address.
     * @param tokenId Account address.
     * @return The warpers rental state.
     */
    function getWarperRentalStatus(address warper, uint256 tokenId) external view returns (WarperRentalStatus);

    /**
     * @dev Evaluates renting params and returns rental fee breakdown.
     * @param rentingParams Renting parameters.
     * @return listerBaseFee
     * @return listerPremium
     * @return universeBaseFee
     * @return universePremium
     * @return protocolFee
     * @return total
     */
    function estimateRent(Rentings.Params calldata rentingParams)
        external
        view
        returns (
            uint256 listerBaseFee,
            uint256 listerPremium,
            uint256 universeBaseFee,
            uint256 universePremium,
            uint256 protocolFee,
            uint256 total
        );

    /**
     * @dev Performs renting operation.
     * @param rentingParams Renting parameters.
     * @param maxPaymentAmount Maximal payment amount the renter is willing to pay.
     * @return New rental ID.
     */
    function rent(Rentings.Params calldata rentingParams, uint256 maxPaymentAmount) external returns (uint256);
}
