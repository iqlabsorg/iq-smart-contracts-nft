// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../Warper.sol";
import "./IWarperAssetRentability.sol";

/**
 * @dev Thrown when the the min rental period is not strictly lesser than max rental period
 */
error InvalidMinRentalPeriod();

/**
 * @dev Thrown when the max rental period is not greater or equal than min rental period
 */
error InvalidMaxRentalPeriod();

abstract contract WarperAssetRentability is IWarperAssetRentability, Warper {
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

    function _WarperAssetRentability_init() internal onlyInitializing {
        // Store default values.
        _setMaxRentalPeriod(type(uint32).max);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(Warper) returns (bool) {
        return
            interfaceId == type(IWarperAssetRentability).interfaceId ||
            interfaceId == type(IRentalPeriodProviderMechanics).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IWarperAssetRentability
     */
    function __setMinRentalPeriod(uint32 minRentalPeriod) external virtual onlyWarperAdmin {
        if (minRentalPeriod > _maxRentalPeriod()) revert InvalidMinRentalPeriod();
        _setMinRentalPeriod(minRentalPeriod);
    }

    /**
     * @inheritdoc IWarperAssetRentability
     */
    function __setMaxRentalPeriod(uint32 maxRentalPeriod) external virtual onlyWarperAdmin {
        if (_minRentalPeriod() > maxRentalPeriod) revert InvalidMaxRentalPeriod();
        _setMaxRentalPeriod(maxRentalPeriod);
    }

    /**
     * @inheritdoc IRentalPeriodProviderMechanics
     */
    function __minRentalPeriod() external view virtual returns (uint32) {
        return _minRentalPeriod();
    }

    /**
     * @inheritdoc IRentalPeriodProviderMechanics
     */
    function __maxRentalPeriod() external view virtual override returns (uint32) {
        return _maxRentalPeriod();
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
