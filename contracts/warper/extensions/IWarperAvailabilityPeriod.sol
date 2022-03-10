// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IWarperAvailabilityPeriod {
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
}
