// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "./Assets.sol";

interface IAssetController is IERC165 {
    /**
     * @dev Thrown when the asset has invalid class for specific operation.
     * @param provided Provided class ID.
     * @param required Required class ID.
     */
    error AssetClassMismatch(bytes4 provided, bytes4 required);

    /**
     * @dev Emitted when asset is transferred.
     * @param asset Asset being transferred.
     * @param from Asset sender.
     * @param to Asset recipient.
     * @param data Auxiliary data.
     */
    event AssetTransfer(Assets.Asset asset, address indexed from, address indexed to, bytes data);

    /**
     * @dev Returns controller asset class.
     * @return Asset class ID.
     */
    function assetClass() external pure returns (bytes4);

    /**
     * @dev Transfers asset.
     * Emits a {AssetTransfer} event.
     * @param asset Asset being transferred.
     * @param from Asset sender.
     * @param to Asset recipient.
     * @param data Auxiliary data.
     */
    function transfer(
        Assets.Asset memory asset,
        address from,
        address to,
        bytes memory data
    ) external;

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
     * @dev Decodes asset ID structure and returns collection identifier.
     * The collection ID is byte32 value which is calculated based on the asset class.
     * For example, ERC721 collection can be identified by address only,
     * but for ERC1155 it should be calculated based on address and token ID.
     * @return Collection ID.
     */
    function collectionId(Assets.AssetId memory assetId) external pure returns (bytes32);
}
