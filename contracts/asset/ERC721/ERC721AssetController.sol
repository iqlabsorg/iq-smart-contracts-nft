// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "../../Errors.sol";
import "../IAssetController.sol";
import "../Assets.sol";
import "./ERC721AssetVault.sol";

/**
 * @title Asset controller for the ERC721 tokens
 */
contract ERC721AssetController is IAssetController {
    using Assets for Assets.AssetId;

    /**
     * @dev Thrown when the asset value is invalid for ERC721 token standard.
     */
    error InvalidERC721Value(uint256 value);

    /**
     * @inheritdoc IAssetController
     */
    function assetClass() public pure returns (bytes4) {
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
        //todo: check vault interface
        _transferAsset(asset, assetOwner, vault, "");
    }

    /**
     * @inheritdoc IAssetController
     */
    function returnAssetFromVault(Assets.Asset memory asset, address vault) external {
        _validateAsset(asset);
        // Decode asset ID to extract identification data.
        (address token, uint256 tokenId) = _decodeAssetId(asset.id);
        IERC721AssetVault(vault).returnToOwner(token, tokenId);
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

    /**
     * @inheritdoc IAssetController
     */
    function collectionId(Assets.AssetId memory assetId) external pure returns (bytes32) {
        if (assetId.class != assetClass()) revert AssetClassMismatch(assetId.class, assetClass());
        return _collectionId(assetId.token());
    }

    /**
     * @dev Calculates collection ID.
     * Foe ERC721 tokens, the collection ID is calculated by hashing the contract address itself.
     */
    function _collectionId(address token) internal pure returns (bytes32) {
        return keccak256(abi.encode(token));
    }

    /**
     * @dev Executes asset transfer.
     */
    function _transferAsset(
        Assets.Asset memory asset,
        address from,
        address to,
        bytes memory data
    ) internal {
        // Make user the asset is valid before decoding and transferring.
        _validateAsset(asset);

        // Decode asset ID to extract identification data, required for transfer.
        (address token, uint256 tokenId) = _decodeAssetId(asset.id);

        // Execute safe transfer.
        IERC721(token).safeTransferFrom(from, to, tokenId, data);
        emit AssetTransfer(asset, from, to, data);
    }

    /**
     * @dev Decodes asset ID and extracts identification data.
     * @param id Asset ID structure.
     * @return token Token contract address.
     * @return tokenId Token ID.
     */
    function _decodeAssetId(Assets.AssetId memory id) internal pure returns (address token, uint256 tokenId) {
        return abi.decode(id.data, (address, uint256));
    }

    /**
     * @dev Encodes asset ID.
     * @param token Token contract address.
     * @param tokenId Token ID.
     * @return Asset ID structure.
     */
    function _encodeAssetId(address token, uint256 tokenId) internal pure returns (Assets.AssetId memory) {
        return Assets.AssetId(assetClass(), abi.encode(token, tokenId));
    }

    /**
     * @dev Throws if the asset params are not valid.
     * @param asset Asset structure.
     */
    function _validateAsset(Assets.Asset memory asset) internal pure {
        // Ensure correct class.
        if (asset.id.class != assetClass()) revert AssetClassMismatch(asset.id.class, assetClass());
        // Ensure correct value, must be 1 for NFT.
        if (asset.value != 1) revert InvalidERC721Value(asset.value);
    }
}
