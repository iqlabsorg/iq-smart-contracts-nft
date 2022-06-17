// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./IAssetController.sol";

abstract contract AssetController is IAssetController, ERC165 {
    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IAssetController).interfaceId || super.supportsInterface(interfaceId);
    }
}
