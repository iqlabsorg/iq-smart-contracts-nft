// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IRentalPeriodMechanics.sol";

interface IConfigurableRentalPeriodExtension is IRentalPeriodMechanics {
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