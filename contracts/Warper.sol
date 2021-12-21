// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IWarper.sol";

abstract contract Warper is IWarper, Context, ERC165 {
    // This is the keccak-256 hash of "iq.protocol.nft.original" subtracted by 1
    bytes32 internal constant _ORIGINAL_SLOT = 0x855a0282585e35fc8dbb4da2088acdbe4b69460635994619e934d7c30b91f660;

    /**
     * @dev Thrown when the original NFT does not implement the interface, expected by Wrapping.
     */
    error InvalidOriginalTokenInterface(address original, bytes4 expectedInterfaceId);

    constructor(address original) {
        _validateOriginal(original);
        StorageSlot.getAddressSlot(_ORIGINAL_SLOT).value = original;
    }

    /**
     * @dev Returns the original NFT address.
     */
    function __original() public view override returns (address) {
        return StorageSlot.getAddressSlot(_ORIGINAL_SLOT).value;
    }

    /**
     * @dev Forwards the current call to `target`.
     *
     * This function does not return to its internal call site, it will return directly to the external caller.
     */
    function _forward(address target) internal {
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

    /**
     * @dev Forwards the current call to the address returned by `_original()`.
     *
     * This function does not return to its internal call site, it will return directly to the external caller.
     */
    function _fallback() internal virtual {
        _beforeFallback();
        _forward(__original());
    }

    /**
     * @dev Fallback function that forwards calls to the address returned by `_original()`. Will run if no other
     * function in the contract matches the call data.
     */
    fallback() external payable virtual {
        _fallback();
    }

    /**
     * @dev Fallback function that forwards calls to the address returned by `_original()`. Will run if call data
     * is empty.
     */
    receive() external payable virtual {
        _fallback();
    }

    /**
     * @dev Hook that is called before falling back to the original. Can happen as part of a manual `_fallback`
     * call, or as part of the Solidity `fallback` or `receive` functions.
     *
     * If overridden should call `super._beforeFallback()`.
     */
    function _beforeFallback() internal virtual {}

    /**
     * @dev Validates the original NFT.
     *
     * If overridden should call `super._validateOriginal()`.
     */
    function _validateOriginal(address original) internal virtual {}
}
