// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../universe/IUniverseManager.sol";
import "../warper/IWarperManager.sol";
import "../listing/IListingManager.sol";
import "../renting/IRentingManager.sol";

interface IMetahub is IUniverseManager, IWarperManager, IListingManager, IRentingManager {
    /**
     * @dev Get the base token that's used for stable price denomination.
     * @return The base token address
     */
    function baseToken() external view returns (address);
}
