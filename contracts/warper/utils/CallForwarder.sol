// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

abstract contract CallForwarder {
    /**
     * @dev Thrown when a call is forwarded to a zero address.
     */
    error CallForwardToZeroAddress();

    /**
     * @dev Forwards the current call to `target`.
     */
    function _forward(address target) internal {
        // Prevent call forwarding to the zero address.
        if (target == address(0)) {
            revert CallForwardToZeroAddress();
        }

        uint256 value = msg.value;
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Call the target.
            // out and outsize are 0 for now, as we don't know the out size yet.
            let result := call(gas(), target, value, 0, calldatasize(), 0, 0)

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
            // call returns 0 on error.
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}
