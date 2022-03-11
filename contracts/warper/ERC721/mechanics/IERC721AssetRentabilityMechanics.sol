// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IERC721AssetRentabilityMechanics {
    /**
     * Returns information if an asset is rentable.
     * @param tokenId The token ID.
     * @param renter The address of the renter.
     * @return isRentable True if asset is rentable.
     * @return errorMessage
     */
    function isRentableAsset(uint256 tokenId, address renter)
        external
        returns (bool isRentable, string memory errorMessage);
}
