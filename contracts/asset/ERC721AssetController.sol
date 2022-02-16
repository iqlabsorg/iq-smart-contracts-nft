// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./ERC721TransferExecutor.sol";
import "./IAssetController.sol";

contract ERC721AssetController is IAssetController, ERC721TransferExecutor {
    /**
     * @inheritdoc IAssetController
     */
    function assetClass() external pure returns (bytes4) {
        return Assets.ERC721;
    }

    /**
     * @inheritdoc IAssetController
     */
    function transfer(
        Assets.Asset memory asset,
        address from,
        address to,
        bytes memory data
    ) external {
        _transferAsset(asset, from, to, data);
    }
}
