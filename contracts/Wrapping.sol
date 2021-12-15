// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";

abstract contract Wrapping {
    // This is the keccak-256 hash of "iq.protocol.nft.origin" subtracted by 1
    bytes32 private constant _ORIGIN_SLOT = 0xe4336431d1ef970bc473c88d1d8a156bf0381c20ecb30f717ff6e667b22be897;

    constructor(address origin) {
        StorageSlot.getAddressSlot(_ORIGIN_SLOT).value = origin;
    }

    /**
     * @dev Returns the original NFT address.
     */
    function _getOrigin() internal view returns (address) {
        return StorageSlot.getAddressSlot(_ORIGIN_SLOT).value;
    }
}
