// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

library Rentings {
    /**
     * @dev Renting parameters structure. It is used to encode all the necessary information to estimate and/or fulfill a particular renting request.
     * @param listingId Listing ID. Also allows to identify the asset being rented.
     * @param warper Warper address.
     * @param renter Renter address.
     * @param rentalPeriod Desired period of asset renting.
     */
    struct Params {
        uint256 listingId;
        address warper;
        address renter;
        uint32 rentalPeriod;
    }

    // todo: docs
    struct Agreement {
        uint256 listingId;
        address warper;
        address renter;
        uint32 startTime;
        uint32 endTime;
    }
}
