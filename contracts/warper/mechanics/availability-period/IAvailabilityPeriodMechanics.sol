// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity ^0.8.13;

interface IAvailabilityPeriodMechanics {
    /**
     * @dev Thrown when the current time is not withing the warper availability period.
     */
    error WarperIsNotAvailableForRenting(
        uint256 currentTime,
        uint32 availabilityPeriodStart,
        uint32 availabilityPeriodEnd
    );

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

    /**
     * @dev Returns warper availability period.
     * @return availabilityPeriodStart Unix timestamp after which the warper is rentable.
     * @return availabilityPeriodEnd Unix timestamp after which the warper is NOT rentable.
     */
    function __availabilityPeriodRange()
        external
        view
        returns (uint32 availabilityPeriodStart, uint32 availabilityPeriodEnd);
}
