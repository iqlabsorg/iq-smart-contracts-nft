// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/StorageSlot.sol";

abstract contract RentalPeriodStore {
    /**
     * @dev Warper min rental period.
     */
    bytes32 private constant _MIN_RENTAL_PERIOD_SLOT =
        bytes32(uint256(keccak256("iq.warper.params.minRentalPeriod")) - 1);

    /**
     * @dev Warper max rental period.
     */
    bytes32 private constant _MAX_RENTAL_PERIOD_SLOT =
        bytes32(uint256(keccak256("iq.warper.params.maxRentalPeriod")) - 1);

    /**
     * @dev Stores warper minimal rental period.
     */
    function _setMinRentalPeriod(uint32 minRentalPeriod) internal {
        StorageSlot.getUint256Slot(_MIN_RENTAL_PERIOD_SLOT).value = uint256(minRentalPeriod);
    }

    /**
     * @dev Stores warper maximal rental period.
     */
    function _setMaxRentalPeriod(uint32 maxRentalPeriod) internal {
        StorageSlot.getUint256Slot(_MAX_RENTAL_PERIOD_SLOT).value = uint256(maxRentalPeriod);
    }

    /**
     * @dev Returns warper minimal rental period.
     */
    function _minRentalPeriod() internal view returns (uint32) {
        return uint32(StorageSlot.getUint256Slot(_MIN_RENTAL_PERIOD_SLOT).value);
    }

    /**
     * @dev Returns warper maximal rental period.
     */
    function _maxRentalPeriod() internal view returns (uint32) {
        return uint32(StorageSlot.getUint256Slot(_MAX_RENTAL_PERIOD_SLOT).value);
    }
}
