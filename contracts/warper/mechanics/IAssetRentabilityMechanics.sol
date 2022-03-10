// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IAssetRentabilityMechanics {
    /**
     * Returns information if an asset is rentable.
     * @return isRentable True if asset is rentable.
     * @return errorMessage
     */
    function isRentableAsset() external returns (bool isRentable, string memory errorMessage);
}
