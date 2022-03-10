// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../Warper.sol";
import "./IWarperAvailabilityPeriod.sol";

/**
 * @dev Thrown when the availability period start time is not strictly lesser than the end time
 */
error InvalidAvailabilityPeriodStart();

/**
 * @dev Thrown when the availability period end time is not greater or equal than the start time
 */
error InvalidAvailabilityPeriodEnd();

abstract contract WarperAvailabilityPeriod is IWarperAvailabilityPeriod, Warper {
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

    function _WarperAvailabilityPeriod_init() internal onlyInitializing {
        // Store default values.
        _setAvailabilityPeriodEnd(type(uint32).max);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(Warper) returns (bool) {
        return
            interfaceId == type(IWarperAvailabilityPeriod).interfaceId ||
            interfaceId == type(IAvailabilityPeriodProviderMechanics).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IWarperAvailabilityPeriod
     */
    function __setAvailabilityPeriodStart(uint32 availabilityPeriodStart) external virtual onlyWarperAdmin {
        if (availabilityPeriodStart >= _availabilityPeriodEnd()) revert InvalidAvailabilityPeriodStart();
        _setAvailabilityPeriodStart(availabilityPeriodStart);
    }

    /**
     * @inheritdoc IWarperAvailabilityPeriod
     */
    function __setAvailabilityPeriodEnd(uint32 availabilityPeriodEnd) external virtual onlyWarperAdmin {
        if (_availabilityPeriodStart() >= availabilityPeriodEnd) revert InvalidAvailabilityPeriodEnd();
        _setAvailabilityPeriodEnd(availabilityPeriodEnd);
    }

    /**
     * @inheritdoc IAvailabilityPeriodProviderMechanics
     */
    function __availabilityPeriodStart() external view virtual returns (uint32) {
        return _availabilityPeriodStart();
    }

    /**
     * @inheritdoc IAvailabilityPeriodProviderMechanics
     */
    function __availabilityPeriodEnd() external view virtual returns (uint32) {
        return _availabilityPeriodEnd();
    }

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
}
