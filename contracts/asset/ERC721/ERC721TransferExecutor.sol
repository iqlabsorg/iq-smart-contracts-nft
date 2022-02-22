// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "../Assets.sol";
import "../../Errors.sol";
import "../IAssetTransferExecutor.sol";

/**
 * @dev Thrown when the asset transfer value is invalid for ERC721 token standard.
 */
error InvalidERC721TransferValue(uint256 value);

abstract contract ERC721TransferExecutor is IAssetTransferExecutor {
    /**
     * @inheritdoc IAssetTransferExecutor
     */
    function transfer(
        Assets.Asset memory asset,
        address from,
        address to,
        bytes memory data
    ) external {
        _transferAsset(asset, from, to, data);
    }

    /**
     * @dev Executes asset transfer.
     */
    function _transferAsset(
        Assets.Asset memory asset,
        address from,
        address to,
        bytes memory data
    ) internal virtual {
        // Ensure correct asset class.
        if (asset.id.class != Assets.ERC721) {
            revert AssetClassMismatch(asset.id.class, Assets.ERC721);
        }

        // Ensure correct value, must be 1 for NFT.
        if (asset.value != 1) {
            revert InvalidERC721TransferValue(asset.value);
        }

        // Decode asset ID to extract identification data, required for transfer.
        (address token, uint256 tokenId) = _decodeAssetId(asset.id);

        // Execute safe transfer.
        IERC721(token).safeTransferFrom(from, to, tokenId, data);
        emit AssetTransfer(asset, from, to, data);
    }

    /**
     * @dev Decodes asset ID and extracts identification data.
     * @return token Token contract address.
     * @return tokenId Token ID.
     */
    function _decodeAssetId(Assets.AssetId memory id) internal virtual returns (address token, uint256 tokenId) {
        return abi.decode(id.data, (address, uint256));
    }
}
