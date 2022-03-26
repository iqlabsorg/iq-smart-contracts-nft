// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

library Protocol {
    /**
     * @dev Protocol configuration.
     * @param baseToken ERC20 contract. Used as the price denominator.
     * @param rentalFeePercent The fixed part of the total rental fee paid to protocol.
     */
    struct Config {
        IERC20Upgradeable baseToken;
        uint16 rentalFeePercent;
    }
}
