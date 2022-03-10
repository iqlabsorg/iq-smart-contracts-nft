// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IAvailabilityPeriodProviderMechanics {
    struct AvailabilityPeriodParams {
        uint32 availabilityPeriodStart;
        uint32 availabilityPeriodEnd;
    }

    /**
     * @dev Returns warper availability period starting time.
     * @return Unix timestamp after which the warper is rentable.
     */
    function __availabilityPeriodStart() external view returns (uint32);

    /**
     * @dev Returns warper availability period ending time.
     * @return Unix timestamp after which the warper is NOT rentable.
     */
    function __availabilityPeriodEnd() external view returns (uint32);
}
