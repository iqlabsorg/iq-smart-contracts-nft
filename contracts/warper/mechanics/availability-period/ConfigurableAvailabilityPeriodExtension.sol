// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore, func-name-mixedcase, ordering
pragma solidity ^0.8.13;

import "../../Warper.sol";
import "./IConfigurableAvailabilityPeriodExtension.sol";

abstract contract ConfigurableAvailabilityPeriodExtension is IConfigurableAvailabilityPeriodExtension, Warper {
    /**
     * @dev Warper availability period.
     */
    bytes32 private constant _AVAILABILITY_PERIOD_SLOT =
        bytes32(uint256(keccak256("iq.warper.params.availabilityPeriod")) - 1);

    uint256 private constant _MAX_PERIOD_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000;
    uint256 private constant _MIN_PERIOD_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFF;
    uint256 private constant _MAX_PERIOD_BITSHIFT = 0;
    uint256 private constant _MIN_PERIOD_BITSHIFT = 32;

    /**
     * Extension initializer.
     */
    function _ConfigurableAvailabilityPeriodExtension_init() internal onlyInitializing {
        _setAvailabilityPeriods(0, type(uint32).max);
    }

    /**
     * @inheritdoc IConfigurableAvailabilityPeriodExtension
     */
    function __setAvailabilityPeriodStart(uint32 availabilityPeriodStart) external virtual onlyWarperAdmin {
        (, uint32 availabilityPeriodEnd) = _availabilityPeriods();
        if (availabilityPeriodStart >= availabilityPeriodEnd) revert InvalidAvailabilityPeriodStart();

        _setAvailabilityPeriods(availabilityPeriodStart, availabilityPeriodEnd);
    }

    /**
     * @inheritdoc IConfigurableAvailabilityPeriodExtension
     */
    function __setAvailabilityPeriodEnd(uint32 availabilityPeriodEnd) external virtual onlyWarperAdmin {
        (uint32 availabilityPeriodStart, ) = _availabilityPeriods();
        if (availabilityPeriodStart >= availabilityPeriodEnd) revert InvalidAvailabilityPeriodEnd();

        _setAvailabilityPeriods(availabilityPeriodStart, availabilityPeriodEnd);
    }

    /**
     * @inheritdoc IAvailabilityPeriodMechanics
     */
    function __availabilityPeriodStart() external view virtual returns (uint32) {
        (uint32 availabilityPeriodStart, ) = _availabilityPeriods();
        return availabilityPeriodStart;
    }

    /**
     * @inheritdoc IAvailabilityPeriodMechanics
     */
    function __availabilityPeriodEnd() external view virtual returns (uint32) {
        (, uint32 availabilityPeriodEnd) = _availabilityPeriods();
        return availabilityPeriodEnd;
    }

    /**
     * @inheritdoc IAvailabilityPeriodMechanics
     */
    function __availabilityPeriodRange()
        external
        view
        virtual
        returns (uint32 availabilityPeriodStart, uint32 availabilityPeriodEnd)
    {
        (availabilityPeriodStart, availabilityPeriodEnd) = _availabilityPeriods();
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(Warper) returns (bool) {
        return
            interfaceId == type(IConfigurableAvailabilityPeriodExtension).interfaceId ||
            interfaceId == type(IAvailabilityPeriodMechanics).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev Stores warper availability period.
     */
    function _setAvailabilityPeriods(uint32 availabilityPeriodStart, uint32 availabilityPeriodEnd) internal {
        uint256 data = (0 & _MAX_PERIOD_MASK) | (uint256(availabilityPeriodEnd) << _MAX_PERIOD_BITSHIFT);
        data = (data & _MIN_PERIOD_MASK) | (uint256(availabilityPeriodStart) << _MIN_PERIOD_BITSHIFT);

        StorageSlot.getUint256Slot(_AVAILABILITY_PERIOD_SLOT).value = data;
    }

    /**
     * @dev Returns warper availability period.
     */
    function _availabilityPeriods()
        internal
        view
        returns (uint32 availabilityPeriodStart, uint32 availabilityPeriodEnd)
    {
        uint256 data = StorageSlot.getUint256Slot(_AVAILABILITY_PERIOD_SLOT).value;
        availabilityPeriodStart = uint32((data & ~_MIN_PERIOD_MASK) >> _MIN_PERIOD_BITSHIFT);
        availabilityPeriodEnd = uint32((data & ~_MAX_PERIOD_MASK) >> _MAX_PERIOD_BITSHIFT);
    }
}
