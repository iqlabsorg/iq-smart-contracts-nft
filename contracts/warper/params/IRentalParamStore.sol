// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IRentalParamStore {
    /**
     * @dev Sets warper min rental period.
     * @param minRentalPeriod New min rental period value.
     */
    function __setMinRentalPeriod(uint256 minRentalPeriod) external;

    /**
     * @dev Sets warper max rental period.
     * @param maxRentalPeriod New max rental period value.
     */
    function __setMaxRentalPeriod(uint256 maxRentalPeriod) external;

    /**
     * @dev Returns warper min rental period.
     */
    function __minRentalPeriod() external view returns (uint256);

    /**
     * @dev Returns warper max rental period.
     */
    function __maxRentalPeriod() external view returns (uint256);
}
