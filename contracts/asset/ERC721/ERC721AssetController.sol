// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./ERC721TransferExecutor.sol";
import "../IAssetController.sol";
import "./IERC721AssetVault.sol";

contract ERC721AssetController is IAssetController, ERC721TransferExecutor {
    bytes4 internal constant _ERC721VAULT_INTERFACE_ID = type(IERC721AssetVault).interfaceId;

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
}
