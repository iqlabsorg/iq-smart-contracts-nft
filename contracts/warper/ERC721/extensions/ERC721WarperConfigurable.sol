// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../ERC721Warper.sol";
import "../../utils/RentalParamStore.sol";
import "../../IRentalParamStore.sol";

//todo: add Multicall trait
//todo: validate: minRentalPeriod <= maxRentalPeriod (revert with InvalidMinRentalPeriod / InvalidMaxRentalPeriod)
//todo: validate: availabilityPeriodStart < availabilityPeriodEnd (revert with InvalidAvailabilityPeriodStart / InvalidAvailabilityPeriodEnd)
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
        _setMinRentalPeriod(minRentalPeriod);
    }

    /**
     * @inheritdoc IRentalParamStore
     */
    function __setMaxRentalPeriod(uint32 maxRentalPeriod) external virtual onlyWarperAdmin {
        _setMaxRentalPeriod(maxRentalPeriod);
    }

    /**
     * @inheritdoc IRentalParamStore
     */
    function __setAvailabilityPeriodStart(uint32 availabilityPeriodStart) external virtual onlyWarperAdmin {
        _setAvailabilityPeriodStart(availabilityPeriodStart);
    }

    /**
     * @inheritdoc IRentalParamStore
     */
    function __setAvailabilityPeriodEnd(uint32 availabilityPeriodEnd) external virtual onlyWarperAdmin {
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
