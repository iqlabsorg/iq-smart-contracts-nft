// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/StorageSlot.sol";

abstract contract RentalParamStore {
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
     * @dev Warper availability period start.
     */
    bytes32 private constant _AVAILABILITY_PERIOD_START_SLOT =
        bytes32(uint256(keccak256("iq.warper.params.availabilityPeriodStart")) - 1);

    /**
     * @dev Warper availability period end.
     */
    bytes32 private constant _AVAILABILITY_PERIOD_END_SLOT =
        bytes32(uint256(keccak256("iq.warper.params.availabilityPeriodEnd")) - 1);

    /**
     * @dev Stores warper availability period starting time.
     */
    function _setAvailabilityPeriodStart(uint32 availabilityPeriodStart) internal {
        StorageSlot.getUint256Slot(_AVAILABILITY_PERIOD_START_SLOT).value = uint256(availabilityPeriodStart);
    }

    /**
     * @dev Stores warper availability period ending time.
     */
    function _setAvailabilityPeriodEnd(uint32 availabilityPeriodEnd) internal {
        StorageSlot.getUint256Slot(_AVAILABILITY_PERIOD_END_SLOT).value = uint256(availabilityPeriodEnd);
    }

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
     * @dev Returns warper availability period starting time.
     */
    function _availabilityPeriodStart() internal view returns (uint32) {
        return uint32(StorageSlot.getUint256Slot(_AVAILABILITY_PERIOD_START_SLOT).value);
    }

    /**
     * @dev Returns warper availability period ending time.
     */
    function _availabilityPeriodEnd() internal view returns (uint32) {
        return uint32(StorageSlot.getUint256Slot(_AVAILABILITY_PERIOD_END_SLOT).value);
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
