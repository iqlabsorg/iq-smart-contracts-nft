// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

library Protocol {
    /**
     * @dev Thrown when the provided token does not match with the configured base token.
     */
    error BaseTokenMismatch();

    /**
     * @dev Protocol configuration.
     * @param baseToken ERC20 contract. Used as the price denominator.
     * @param rentalFeePercent The fixed part of the total rental fee paid to protocol.
     */
    struct Config {
        IERC20Upgradeable baseToken;
        uint16 rentalFeePercent;
    }

    /**
     * @dev Reverts if the `token` does not match the base one.
     */
    function checkBaseToken(Config storage self, address token) internal view {
        if (token != address(self.baseToken)) revert BaseTokenMismatch();
    }
}
