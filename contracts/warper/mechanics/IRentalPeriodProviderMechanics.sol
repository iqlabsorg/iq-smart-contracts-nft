// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IRentalPeriodProviderMechanics {
    struct RentalPeriodParams {
        uint32 minRentalPeriod;
        uint32 maxRentalPeriod;
    }

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
}
