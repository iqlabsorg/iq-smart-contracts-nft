// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "../../Errors.sol";
import "../IAssetController.sol";
import "./IERC721AssetVault.sol";
import "../../warper/ERC721/IERC721Warper.sol";

/**
 * @dev Thrown when the asset transfer value is invalid for ERC721 token standard.
 */
error InvalidERC721TransferValue(uint256 value);

/**
 * @title Asset controller for the ERC721 tokens
 */
contract ERC721AssetController is IAssetController {
    /**
     * @notice The supported Warpers interface
     */
    bytes4 public constant SUPPORTED_WARPER_INTERFACE = type(IERC721Warper).interfaceId;

    /**
     * @inheritdoc IAssetController
     */
    function assetClass() external pure returns (bytes4) {
        return Assets.ERC721;
    }

    /**
     * @inheritdoc IAssetController
     */
    function transferAssetToVault(
        Assets.Asset memory asset,
        address assetOwner,
        address vault
    ) external {
        _transferAsset(asset, assetOwner, vault, "");
    }

    /**
     * @inheritdoc IAssetController
     */
    function returnAssetFromVault(Assets.Asset memory asset, address vault) external {
        // Decode asset ID to extract identification data.
        (address token, uint256 tokenId) = _decodeAssetId(asset.id);
        IERC721AssetVault(vault).returnToOwner(token, tokenId);
    }

    /**
     * @inheritdoc IAssetController
     */
    function getToken(Assets.Asset memory asset) external pure returns (address) {
        (address token, ) = _decodeAssetId(asset.id);
        return token;
    }

    /**
     * @inheritdoc IAssetController
     */
    function isCompatibleWarper(IWarper warper) external view returns (bool) {
        return warper.supportsInterface(SUPPORTED_WARPER_INTERFACE);
    }

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
    function _decodeAssetId(Assets.AssetId memory id) internal pure virtual returns (address token, uint256 tokenId) {
        return abi.decode(id.data, (address, uint256));
    }
}
