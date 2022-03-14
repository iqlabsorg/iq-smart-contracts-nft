// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IAssetRentabilityMechanics {
    /**
     * Returns information if an asset is rentable.
     * @param renter The address of the renter.
     * @param tokenId The token ID.
     * @param amount The token amount.
     * @return isRentable True if asset is rentable.
     * @return errorMessage The reason of the asset not being rentable.
     */
    function isRentableAsset(
        address renter,
        uint256 tokenId,
        uint256 amount
    ) external view returns (bool isRentable, string memory errorMessage);
}
