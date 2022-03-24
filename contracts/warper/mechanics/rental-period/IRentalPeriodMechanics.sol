// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IRentalPeriodMechanics {
    /**
     * @dev Thrown when the requested rental period is not withing the warper allowed rental period range.
     */
    error WarperRentalPeriodIsOutOfRange(uint32 requestedRentalPeriod, uint32 minRentalPeriod, uint32 maxRentalPeriod);

    /**
     * @dev Returns warper minimal rental period.
     * @return Time is seconds.
     */
    function __minRentalPeriod() external view returns (uint32);

    /**
     * @dev Returns warper maximal rental period.
     * @return Time is seconds.
     */
    function __maxRentalPeriod() external view returns (uint32);

    /**
     * @dev Returns warper rental period range.
     * @return minRentalPeriod The minimal amount of time the warper can be rented for.
     * @return maxRentalPeriod The maximal amount of time the warper can be rented for.
     */
    function __rentalPeriodRange() external view returns (uint32 minRentalPeriod, uint32 maxRentalPeriod);
}
