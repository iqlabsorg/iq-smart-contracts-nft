// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../../Warper.sol";
import "./IConfigurableRentalPeriodExtension.sol";

abstract contract ConfigurableRentalPeriodExtension is IConfigurableRentalPeriodExtension, Warper {
    /**
     * @dev Thrown when the the min rental period is not strictly lesser than max rental period
     */
    error InvalidMinRentalPeriod();

    /**
     * @dev Thrown when the max rental period is not greater or equal than min rental period
     */
    error InvalidMaxRentalPeriod();

    /**
     * @dev Warper rental period.
     * @dev It contains both - the min and max values (uint32) - in a concatenated form.
     */
    bytes32 private constant _RENTAL_PERIOD_SLOT = bytes32(uint256(keccak256("iq.warper.params.rentalPeriod")) - 1);

    /**
     * @dev Extension initializer.
     */
    function _ConfigurableRentalPeriodExtension_init() internal onlyInitializing {
        // Store default values.
        _setRentalPeriods(0, type(uint32).max);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(Warper) returns (bool) {
        return
            interfaceId == type(IConfigurableRentalPeriodExtension).interfaceId ||
            interfaceId == type(IRentalPeriodMechanics).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IConfigurableRentalPeriodExtension
     */
    function __setMinRentalPeriod(uint32 minRentalPeriod) external virtual onlyWarperAdmin {
        (, uint32 maxRentalPeriod) = _rentalPeriods();
        if (minRentalPeriod > maxRentalPeriod) revert InvalidMinRentalPeriod();

        _setRentalPeriods(minRentalPeriod, maxRentalPeriod);
    }

    /**
     * @inheritdoc IConfigurableRentalPeriodExtension
     */
    function __setMaxRentalPeriod(uint32 maxRentalPeriod) external virtual onlyWarperAdmin {
        (uint32 minRentalPeriod, ) = _rentalPeriods();
        if (minRentalPeriod > maxRentalPeriod) revert InvalidMaxRentalPeriod();

        _setRentalPeriods(minRentalPeriod, maxRentalPeriod);
    }

    /**
     * @inheritdoc IRentalPeriodMechanics
     */
    function __minRentalPeriod() external view virtual returns (uint32) {
        (uint32 minRentalPeriod, ) = _rentalPeriods();
        return minRentalPeriod;
    }

    /**
     * @inheritdoc IRentalPeriodMechanics
     */
    function __maxRentalPeriod() external view virtual override returns (uint32) {
        (, uint32 maxRentalPeriod) = _rentalPeriods();
        return maxRentalPeriod;
    }

    /**
     * @inheritdoc IRentalPeriodMechanics
     */
    function __rentalPeriodRange() external view returns (uint32 minRentalPeriod, uint32 maxRentalPeriod) {
        (minRentalPeriod, maxRentalPeriod) = _rentalPeriods();
    }

    /**
     * @dev Stores warper rental period.
     */
    function _setRentalPeriods(uint32 minRentalPeriod, uint32 maxRentalPeriod) internal {
        StorageSlot.getBytes32Slot(_RENTAL_PERIOD_SLOT).value = bytes32(
            abi.encodePacked(minRentalPeriod, maxRentalPeriod)
        );
    }

    /**
     * @dev Returns warper rental periods.
     */
    function _rentalPeriods() internal view returns (uint32 minRentalPeriod, uint32 maxRentalPeriod) {
        bytes32 slot = StorageSlot.getBytes32Slot(_RENTAL_PERIOD_SLOT).value;
        bytes memory slotAsBytes = abi.encodePacked(slot);
        (minRentalPeriod, maxRentalPeriod) = abi.decode(slotAsBytes, (uint32, uint32));
    }
}
