// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IRentingManager {
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
}
