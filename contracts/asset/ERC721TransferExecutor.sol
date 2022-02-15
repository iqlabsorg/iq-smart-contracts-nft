// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "./Assets.sol";
import "../Errors.sol";

/**
 * @dev Thrown when the asset transfer value is invalid for ERC721 token standard.
 */
error InvalidERC721TransferValue(uint256 value);

abstract contract ERC721TransferExecutor {
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

        // Parse asset identification data.
        (address token, uint256 tokenId) = abi.decode(asset.id.data, (address, uint256));

        // Execute transfer.
        _erc721transfer(IERC721(token), from, to, tokenId);
    }

    /**
     * @dev Executes ERC721 token transfer.
     */
    function _erc721transfer(
        IERC721 token,
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        token.safeTransferFrom(from, to, tokenId);
    }
}
