// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IAssetClassManager.sol";
import "./IUniverseManager.sol";
import "./IWarperManager.sol";
import "./IListingManager.sol";
import "./IRentingManager.sol";

interface IMetahub is IAssetClassManager, IUniverseManager, IWarperManager, IListingManager, IRentingManager {
    /**
     * @dev Get the base token that's used for stable price denomination.
     * @return The base token address
     */
    function baseToken() external view returns (address);
}
