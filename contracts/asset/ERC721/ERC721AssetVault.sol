// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "../AssetVault.sol";
import "../Assets.sol";
import "./IERC721AssetVault.sol";

contract ERC721AssetVault is IERC721AssetVault, AssetVault {
    /**
     * @inheritdoc IAssetVault
     */
    function assetClass() external pure returns (bytes4) {
        return Assets.ERC721;
    }

    /**
     * @dev Vault inventory
     * Mapping token address -> token ID -> owner.
     */
    mapping(address => mapping(uint256 => address)) private _inventory;

    /**
     * @dev Constructor.
     * @param operator First operator account.
     */
    constructor(address operator) AssetVault(operator) {}

    /**
     * @inheritdoc IERC721Receiver
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata
    ) external whenOperational whenNotPaused returns (bytes4) {
        // Only authorised operator should be able put assets into vault.
        _checkRole(OPERATOR_ROLE, operator);
        // Associate received asset with the original owner address.
        // Here message sender is an token address.
        _inventory[_msgSender()][tokenId] = from;

        return this.onERC721Received.selector;
    }

    /**
     * @inheritdoc IERC721AssetVault
     */
    function returnToOwner(address token, uint256 tokenId) external whenAssetReturnAllowed {
        // Check if the asset is registered and the original asset owner is known.
        address owner = _inventory[token][tokenId];
        if (owner == address(0)) revert AssetNotFound();

        // Return asset to the owner.
        delete _inventory[token][tokenId];
        IERC721(token).transferFrom(address(this), owner, tokenId);
    }
}
