// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "../../metahub/IMetahub.sol";
import "./InitializationContext.sol";

abstract contract WarperContext is Context, InitializationContext {
    /**
     * @dev Thrown when the message sender doesn't match the Metahub address.
     */
    error CallerIsNotMetahub();

    /**
     * @dev Thrown when the message sender doesn't match the warper admin address.
     */
    error CallerIsNotWarperAdmin();

    /**
     * @dev Metahub address slot.
     */
    bytes32 private constant _METAHUB_SLOT = bytes32(uint256(keccak256("iq.warper.metahub")) - 1);

    /**
     * @dev Original asset address slot.
     */
    bytes32 private constant _ORIGINAL_SLOT = bytes32(uint256(keccak256("iq.warper.original")) - 1);

    /**
     * @dev Modifier to make a function callable only by the metahub contract.
     */
    modifier onlyMetahub() {
        if (_msgSender() != _metahub()) {
            revert CallerIsNotMetahub();
        }
        _;
    }
    /**
     * @dev Modifier to make a function callable only by the warper admin.
     */
    modifier onlyWarperAdmin() {
        if (!IWarperManager(_metahub()).isWarperAdmin(address(this), _msgSender())) {
            revert CallerIsNotWarperAdmin();
        }
        _;
    }

    /**
     * @dev Sets warper original asset address.
     */
    function _setOriginal(address original) internal onlyInitializingWarper {
        StorageSlot.getAddressSlot(_ORIGINAL_SLOT).value = original;
    }

    /**
     * @dev Sets warper metahub address.
     */
    function _setMetahub(address metahub) internal onlyInitializingWarper {
        StorageSlot.getAddressSlot(_METAHUB_SLOT).value = metahub;
    }

    /**
     * @dev Returns warper original asset address.
     */
    function _original() internal view returns (address) {
        return StorageSlot.getAddressSlot(_ORIGINAL_SLOT).value;
    }

    /**
     * @dev warper metahub address.
     */
    function _metahub() internal view returns (address) {
        return StorageSlot.getAddressSlot(_METAHUB_SLOT).value;
    }
}
