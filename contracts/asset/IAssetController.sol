// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "./Assets.sol";

interface IAssetController {
    event AssetTransfer(Assets.Asset asset, address from, address to); // todo: duplicate of native transfer event?

    /**
     * @dev Returns controller asset class.
     * @return Asset class ID.
     */
    function assetClass() external pure returns (bytes4);

    //todo: docs
    function transfer(
        Assets.Asset memory asset,
        address from,
        address to,
        bytes memory data
    ) external;
}
