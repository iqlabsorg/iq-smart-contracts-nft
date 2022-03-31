// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/interfaces/IERC721Metadata.sol";

interface IUniverseToken is IERC721Metadata {
    /**
     * @dev Mints new token and transfers it to `to` address.
     * @param to Universe owner address.
     * @return Minted token ID.
     */
    function mint(address to) external returns (uint256);
}
