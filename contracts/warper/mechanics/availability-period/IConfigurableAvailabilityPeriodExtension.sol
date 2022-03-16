// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IAvailabilityPeriodMechanics.sol";

interface IConfigurableAvailabilityPeriodExtension is IAvailabilityPeriodMechanics {
    /**
     * @dev Thrown when the availability period start time is not strictly lesser than the end time
     */
    error InvalidAvailabilityPeriodStart();

    /**
     * @dev Thrown when the availability period end time is not greater or equal than the start time
     */
    error InvalidAvailabilityPeriodEnd();

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
