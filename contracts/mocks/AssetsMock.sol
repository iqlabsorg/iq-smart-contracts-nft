// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../asset/Assets.sol";

contract AssetsMock {
    using Assets for Assets.Asset;

    function construct(
        bytes4 assetClass,
        bytes memory data,
        uint256 value
    ) external pure returns (Assets.Asset memory) {
        return Assets.Asset(Assets.AssetId(assetClass, data), value);
    }
}
