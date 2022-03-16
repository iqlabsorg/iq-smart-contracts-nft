// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../../Warper.sol";
import "./IConfigurableRentalPeriodExtension.sol";

abstract contract ConfigurableRentalPeriodExtension is IConfigurableRentalPeriodExtension, Warper {
    /**
     * @dev Warper rental period.
     * @dev It contains both - the min and max values (uint32) - in a concatenated form.
     */
    bytes32 private constant _RENTAL_PERIOD_SLOT = bytes32(uint256(keccak256("iq.warper.params.rentalPeriod")) - 1);

    uint256 private constant MAX_PERIOD_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000;
    uint256 private constant MIN_PERIOD_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFF;
    uint256 private constant MAX_PERIOD_BITSHIFT = 0;
    uint256 private constant MIN_PERIOD_BITSHIFT = 32;

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
        uint256 data = (0 & MAX_PERIOD_MASK) | (uint256(maxRentalPeriod) << MAX_PERIOD_BITSHIFT);
        data = (data & MIN_PERIOD_MASK) | (uint256(minRentalPeriod) << MIN_PERIOD_BITSHIFT);

        StorageSlot.getUint256Slot(_RENTAL_PERIOD_SLOT).value = data;
    }

    /**
     * @dev Returns warper rental periods.
     */
    function _rentalPeriods() internal view returns (uint32 minRentalPeriod, uint32 maxRentalPeriod) {
        uint256 data = StorageSlot.getUint256Slot(_RENTAL_PERIOD_SLOT).value;
        minRentalPeriod = uint32((data & ~MIN_PERIOD_MASK) >> MIN_PERIOD_BITSHIFT);
        maxRentalPeriod = uint32((data & ~MAX_PERIOD_MASK) >> MAX_PERIOD_BITSHIFT);
    }
}
