// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../Warper.sol";
import "../utils/AvailabilityPeriodStore.sol";
import "../mechanics/IAvailabilityPeriodStoreMechanics.sol";
import "../mechanics/IAvailabilityPeriodProviderMechanics.sol";

/**
 * @dev Thrown when the availability period start time is not strictly lesser than the end time
 */
error InvalidAvailabilityPeriodStart();

/**
 * @dev Thrown when the availability period end time is not greater or equal than the start time
 */
error InvalidAvailabilityPeriodEnd();

abstract contract WarperAvailabilityPeriod is
    IAvailabilityPeriodStoreMechanics,
    IAvailabilityPeriodProviderMechanics,
    AvailabilityPeriodStore,
    Warper
{
    function _WarperAvailabilityPeriod_init() internal onlyInitializing {
        // Store default values.
        _setAvailabilityPeriodEnd(type(uint32).max);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(Warper) returns (bool) {
        return
            interfaceId == type(IAvailabilityPeriodStoreMechanics).interfaceId ||
            interfaceId == type(IAvailabilityPeriodProviderMechanics).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IAvailabilityPeriodStoreMechanics
     */
    function __setAvailabilityPeriodStart(uint32 availabilityPeriodStart) external virtual onlyWarperAdmin {
        if (availabilityPeriodStart >= _availabilityPeriodEnd()) revert InvalidAvailabilityPeriodStart();
        _setAvailabilityPeriodStart(availabilityPeriodStart);
    }

    /**
     * @inheritdoc IAvailabilityPeriodStoreMechanics
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
}
