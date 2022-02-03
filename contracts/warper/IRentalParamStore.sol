// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IRentalParamProvider.sol";

interface IRentalParamStore is IRentalParamProvider {
    /**
     * @dev Sets warper availability period starting time.
     * @param availabilityPeriodStart Unix timestamp after which the warper is rentable.
     */
    function __setAvailabilityPeriodStart(uint32 availabilityPeriodStart) external;

    /**
     * @dev Sets warper availability period ending time.
     * @param availabilityPeriodEnd Unix timestamp after which the warper is NOT rentable.
     */
    function __setAvailabilityPeriodEnd(uint32 availabilityPeriodEnd) external;

    /**
     * @dev Sets warper min rental period.
     * @param minRentalPeriod New min rental period value.
     */
    function __setMinRentalPeriod(uint32 minRentalPeriod) external;

    /**
     * @dev Sets warper max rental period.
     * @param maxRentalPeriod New max rental period value.
     */
    function __setMaxRentalPeriod(uint32 maxRentalPeriod) external;
}
