// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/StorageSlot.sol";

abstract contract RentalParamStore {
    /**
     * @dev Warper min rental period.
     */
    bytes32 private constant _MIN_RENTAL_PERIOD_SLOT =
        bytes32(uint256(keccak256("iq.protocol.nft.minRentalPeriod")) - 1);

    /**
     * @dev Warper max rental period.
     */
    bytes32 private constant _MAX_RENTAL_PERIOD_SLOT =
        bytes32(uint256(keccak256("iq.protocol.nft.maxRentalPeriod")) - 1);

    /**
     * @dev Sets warper minimal rental period.
     */
    function _setMinRentalPeriod(uint256 newValue) internal returns (uint256) {
        return StorageSlot.getUint256Slot(_MIN_RENTAL_PERIOD_SLOT).value = newValue;
    }

    /**
     * @dev Sets warper maximal rental period.
     */
    function _setMaxRentalPeriod(uint256 newValue) internal returns (uint256) {
        return StorageSlot.getUint256Slot(_MAX_RENTAL_PERIOD_SLOT).value = newValue;
    }

    /**
     * @dev Returns warper minimal rental period.
     */
    function _minRentalPeriod() internal view returns (uint256) {
        return StorageSlot.getUint256Slot(_MIN_RENTAL_PERIOD_SLOT).value;
    }

    /**
     * @dev Returns warper maximal rental period.
     */
    function _maxRentalPeriod() internal view returns (uint256) {
        return StorageSlot.getUint256Slot(_MAX_RENTAL_PERIOD_SLOT).value;
    }
}
