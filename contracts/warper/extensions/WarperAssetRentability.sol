// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../Warper.sol";
import "../utils/RentalPeriodStore.sol";
import "../mechanics/IRentalPeriodStoreMechanics.sol";
import "../mechanics/IRentalPeriodProviderMechanics.sol";

/**
 * @dev Thrown when the the min rental period is not strictly lesser than max rental period
 */
error InvalidMinRentalPeriod();

/**
 * @dev Thrown when the max rental period is not greater or equal than min rental period
 */
error InvalidMaxRentalPeriod();

abstract contract WarperAssetRentability is
    IRentalPeriodProviderMechanics,
    IRentalPeriodStoreMechanics,
    RentalPeriodStore,
    Warper
{
    function _WarperAssetRentability_init() internal onlyInitializing {
        // Store default values.
        _setMaxRentalPeriod(type(uint32).max);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(Warper) returns (bool) {
        return
            interfaceId == type(IRentalPeriodStoreMechanics).interfaceId ||
            interfaceId == type(IRentalPeriodProviderMechanics).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IRentalPeriodStoreMechanics
     */
    function __setMinRentalPeriod(uint32 minRentalPeriod) external virtual onlyWarperAdmin {
        if (minRentalPeriod > _maxRentalPeriod()) revert InvalidMinRentalPeriod();
        _setMinRentalPeriod(minRentalPeriod);
    }

    /**
     * @inheritdoc IRentalPeriodStoreMechanics
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
}
