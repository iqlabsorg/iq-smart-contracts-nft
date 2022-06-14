// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity 0.8.13;

interface IAssetRentabilityMechanics {
    /**
     * @dev Thrown when the asset renting is rejected by warper due to the `reason`.
     */
    error AssetIsNotRentable(string reason);

    /**
     * Returns information if an asset is rentable.
     * @param renter The address of the renter.
     * @param tokenId The token ID.
     * @param amount The token amount.
     * @return isRentable True if asset is rentable.
     * @return errorMessage The reason of the asset not being rentable.
     */
    function __isRentableAsset(
        address renter,
        uint256 tokenId,
        uint256 amount
    ) external view returns (bool isRentable, string memory errorMessage);
}
