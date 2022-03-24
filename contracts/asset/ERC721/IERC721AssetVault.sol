// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import "../IAssetVault.sol";

interface IERC721AssetVault is IAssetVault, IERC721Receiver {
    /**
     * @dev Transfers the asset to the original owner, registered upon deposit.
     * NOTE: The asset is always returns to the owner. There is no way to send the `asset` to an arbitrary address.
     * @param token Token address.
     * @param tokenId Token ID.
     */
    function returnToOwner(address token, uint256 tokenId) external;
}
