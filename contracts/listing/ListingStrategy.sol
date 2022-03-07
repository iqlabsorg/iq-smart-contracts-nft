// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

library ListingStrategy {
    /*
     * @dev Listing strategy identifiers to be used across the system:
     */
    bytes4 public constant FIXED_PRICE = bytes4(keccak256("FIXED_PRICE"));

    /**
     * @dev Listing strategy params.
     * The layout of `data` might vary for different listing strategies.
     * For example, in case of FIXED_PRICE strategy, the `data` might contain only base rate,
     * and for more advanced auction strategies it might include period, min bid step etc.
     * @param id Listing strategy ID
     * @param data Listing strategy data.
     */
    struct Params {
        bytes4 id;
        bytes data;
    }
}
