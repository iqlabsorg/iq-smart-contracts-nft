// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IPricingManager {
    /**
     * @dev Get the base token that's used for stable price denomination.
     * @return The base token address
     */
    function baseToken() external view returns (address);
}
