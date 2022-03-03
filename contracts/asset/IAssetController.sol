// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "./Assets.sol";
import "./IAssetTransferExecutor.sol";
import "../warper/IWarper.sol";

interface IAssetController is IAssetTransferExecutor {
    /**
     * @dev Returns controller asset class.
     * @return Asset class ID.
     */
    function assetClass() external pure returns (bytes4);

    /**
     * @dev Transfers asset from owner to the vault contract.
     * @param asset Asset being transferred.
     * @param assetOwner Original asset owner address.
     * @param vault Asset vault contract address.
     */
    function transferAssetToVault(
        Assets.Asset memory asset,
        address assetOwner,
        address vault
    ) external;

    /**
     * @dev Transfers asset from the vault contract to the original owner.
     * @param asset Asset being transferred.
     * @param vault Asset vault contract address.
     */
    function returnAssetFromVault(Assets.Asset memory asset, address vault) external;

    /**
     * @dev Decodes asset structure and returns token address.
     * @return Token contract address.
     */
    function getToken(Assets.Asset memory asset) external pure returns (address);

    /**
     * @dev Validates that the warper interface is supported by the current AssetController
     * @param warper warper whose interface we must validate
     * @return bool - `true` if warper is supported
     */
    function isCompatibleWarper(IWarper warper) external view returns (bool);
}
