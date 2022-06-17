// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

abstract contract DelegateContext {
    /**
     * @dev Thrown when a function is called directly and not through a delegatecall.
     */
    error FunctionMustBeCalledThroughDelegatecall();

    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable state-variable-assignment
    address private immutable __self = address(this);

    /**
     * @dev Check that the execution is being performed through a delegatecall call.
     */
    modifier onlyDelegatecall() {
        if (address(this) == __self) revert FunctionMustBeCalledThroughDelegatecall();
        _;
    }
}
