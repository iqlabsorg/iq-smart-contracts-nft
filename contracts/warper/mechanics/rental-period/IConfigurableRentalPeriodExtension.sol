// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity 0.8.13;

import "./IRentalPeriodMechanics.sol";

interface IConfigurableRentalPeriodExtension is IRentalPeriodMechanics {
    /**
     * @dev Thrown when the the min rental period is not strictly lesser than max rental period
     */
    error InvalidMinRentalPeriod();

    /**
     * @dev Thrown when the max rental period is not greater or equal than min rental period
     */
    error InvalidMaxRentalPeriod();

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
