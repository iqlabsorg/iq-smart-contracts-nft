// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../ERC721Warper.sol";
import "../../utils/RentalParamStore.sol";
import "../../IRentalParamStore.sol";

abstract contract ERC721WarperConfigurable is ERC721Warper, RentalParamStore, IRentalParamStore {
    /// @inheritdoc IRentalParamStore
    function __setMinRentalPeriod(uint32 minRentalPeriod) external virtual override onlyWarperAdmin {
        _setMinRentalPeriod(minRentalPeriod);
    }

    /// @inheritdoc IRentalParamStore
    function __setMaxRentalPeriod(uint32 maxRentalPeriod) external virtual override onlyWarperAdmin {
        _setMaxRentalPeriod(maxRentalPeriod);
    }

    /// @inheritdoc IRentalParamStore
    function __setAvailabilityPeriodStart(uint32 availabilityPeriodStart) external virtual override onlyWarperAdmin {
        _setAvailabilityPeriodStart(availabilityPeriodStart);
    }

    /// @inheritdoc IRentalParamStore
    function __setAvailabilityPeriodEnd(uint32 availabilityPeriodEnd) external virtual override onlyWarperAdmin {
        _setAvailabilityPeriodEnd(availabilityPeriodEnd);
    }

    /// @inheritdoc IRentalParamProvider
    function __availabilityPeriodStart() external view virtual override returns (uint32) {
        return _availabilityPeriodStart();
    }

    /// @inheritdoc IRentalParamProvider
    function __availabilityPeriodEnd() external view virtual override returns (uint32) {
        return _availabilityPeriodEnd();
    }

    /// @inheritdoc IRentalParamProvider
    function __minRentalPeriod() external view virtual override returns (uint32) {
        return _minRentalPeriod();
    }

    /// @inheritdoc IRentalParamProvider
    function __maxRentalPeriod() external view virtual override returns (uint32) {
        return _maxRentalPeriod();
    }

    /// @inheritdoc IRentalParamProvider
    function __rentalParams() external view virtual override returns (RentalParams memory) {
        return
            RentalParams(_availabilityPeriodStart(), _availabilityPeriodEnd(), _minRentalPeriod(), _maxRentalPeriod());
    }
}
