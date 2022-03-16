// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "@openzeppelin/contracts/utils/Address.sol";

abstract contract InitializationContext {
    // TODO: docs
    error ContractIsAlreadyInitialized();
    error ContractIsNotInitializing();

    /**
     * @dev Indicates that the contract has been initialized.
     */
    bytes32 internal constant _INITIALIZED_SLOT = bytes32(uint256(keccak256("iq.context.initialized")) - 1);

    /**
     * @dev Indicates that the contract is in the process of being initialized.
     */
    bytes32 internal constant _INITIALIZING_SLOT = bytes32(uint256(keccak256("iq.context.initializing")) - 1);

    /**
     * @dev Modifier to protect an initializer function from being invoked twice.
     */
    modifier initializer() {
        bool initialized = !(
            StorageSlot.getBooleanSlot(_INITIALIZING_SLOT).value
                ? _isConstructor()
                : !StorageSlot.getBooleanSlot(_INITIALIZED_SLOT).value
        );

        if (initialized) {
            revert ContractIsAlreadyInitialized();
        }

        bool isTopLevelCall = !StorageSlot.getBooleanSlot(_INITIALIZING_SLOT).value;
        if (isTopLevelCall) {
            StorageSlot.getBooleanSlot(_INITIALIZING_SLOT).value = true;
            StorageSlot.getBooleanSlot(_INITIALIZED_SLOT).value = true;
        }

        _;

        if (isTopLevelCall) {
            StorageSlot.getBooleanSlot(_INITIALIZING_SLOT).value = false;
        }
    }

    /**
     * @dev Modifier to protect an initialization function so that it can only be invoked by functions with the
     * {initializer} modifier, directly or indirectly.
     */
    modifier onlyInitializing() {
        if (!StorageSlot.getBooleanSlot(_INITIALIZING_SLOT).value) {
            revert ContractIsNotInitializing();
        }
        _;
    }

    function _isConstructor() private view returns (bool) {
        return !Address.isContract(address(this));
    }
}
