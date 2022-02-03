// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IRentalParamProvider {
    struct RentalParams {
        uint32 availabilityPeriodStart;
        uint32 availabilityPeriodEnd;
        uint32 minRentalPeriod;
        uint32 maxRentalPeriod;
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
     * @dev Returns warper rental params.
     * @return All rental params in single structure.
     */
    function __rentalParams() external view returns (RentalParams memory);
}
