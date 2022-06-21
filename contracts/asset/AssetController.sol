// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./IAssetController.sol";

abstract contract AssetController is IAssetController, ERC165 {
    /**
     * The fallback function is needed to ensure forward compatibility with Metahub.
     * When introducing a new version of controller with additional external functions,
     * it must be safe to call the those new functions on previous generation of controllers and it must not cause
     * the transaction revert.
     */
    fallback() external {
        // solhint-disable-previous-line no-empty-blocks, payable-fallback
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IAssetController).interfaceId || super.supportsInterface(interfaceId);
    }
}
