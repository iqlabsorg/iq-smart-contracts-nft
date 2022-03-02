// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../ERC721Warper.sol";
import "../../utils/RentalParamStore.sol";
import "../../IRentalParamStore.sol";

/**
 * @dev Thrown when the the min rental period is not strictly lesser than max rental period
 */
error InvalidMinRentalPeriod();

/**
 * @dev Thrown when the max rental period is not greater or equal than min rental period
 */
error InvalidMaxRentalPeriod();

/**
 * @dev Thrown when the availability period start time is not strictly lesser than the end time
 */
error InvalidAvailabilityPeriodStart();

/**
 * @dev Thrown when the availability period end time is not greater or equal than the start time
 */
error InvalidAvailabilityPeriodEnd();

abstract contract ERC721WarperConfigurable is ERC721Warper, RentalParamStore, IRentalParamStore {
    function _ERC721WarperConfigurable_init() internal onlyInitializing {
        // Store default values.
        _setAvailabilityPeriodEnd(type(uint32).max);
        _setMaxRentalPeriod(type(uint32).max);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Warper) returns (bool) {
        return
            interfaceId == type(IRentalParamStore).interfaceId ||
            interfaceId == type(IRentalParamProvider).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IRentalParamStore
     */
    function __setMinRentalPeriod(uint32 minRentalPeriod) external virtual onlyWarperAdmin {
        if (minRentalPeriod > _maxRentalPeriod()) revert InvalidMinRentalPeriod();
        _setMinRentalPeriod(minRentalPeriod);
    }

    /**
     * @inheritdoc IRentalParamStore
     */
    function __setMaxRentalPeriod(uint32 maxRentalPeriod) external virtual onlyWarperAdmin {
        if (_minRentalPeriod() > maxRentalPeriod) revert InvalidMaxRentalPeriod();
        _setMaxRentalPeriod(maxRentalPeriod);
    }

    /**
     * @inheritdoc IRentalParamStore
     */
    function __setAvailabilityPeriodStart(uint32 availabilityPeriodStart) external virtual onlyWarperAdmin {
        if (availabilityPeriodStart >= _availabilityPeriodEnd()) revert InvalidAvailabilityPeriodStart();
        _setAvailabilityPeriodStart(availabilityPeriodStart);
    }

    /**
     * @inheritdoc IRentalParamStore
     */
    function __setAvailabilityPeriodEnd(uint32 availabilityPeriodEnd) external virtual onlyWarperAdmin {
        if (_availabilityPeriodStart() >= availabilityPeriodEnd) revert InvalidAvailabilityPeriodEnd();
        _setAvailabilityPeriodEnd(availabilityPeriodEnd);
    }

    /**
     * @inheritdoc IRentalParamProvider
     */
    function __availabilityPeriodStart() external view virtual returns (uint32) {
        return _availabilityPeriodStart();
    }

    /**
     * @inheritdoc IRentalParamProvider
     */
    function __availabilityPeriodEnd() external view virtual returns (uint32) {
        return _availabilityPeriodEnd();
    }

    /**
     * @inheritdoc IRentalParamProvider
     */
    function __minRentalPeriod() external view virtual returns (uint32) {
        return _minRentalPeriod();
    }

    /**
     * @inheritdoc IRentalParamProvider
     */
    function __maxRentalPeriod() external view virtual override returns (uint32) {
        return _maxRentalPeriod();
    }

    /**
     * @inheritdoc IRentalParamProvider
     */
    function __rentalParams() external view virtual override returns (RentalParams memory) {
        return
            RentalParams(_availabilityPeriodStart(), _availabilityPeriodEnd(), _minRentalPeriod(), _maxRentalPeriod());
    }
}
