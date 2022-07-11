// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "../IWarper.sol";

interface IERC721Warper is IWarper, IERC721 {
    /**
     * @dev Thrown when querying token balance for address(0)
     */
    error BalanceQueryForZeroAddress();

    /**
     * @dev Thrown when querying for the owner of a token that has not been minted yet.
     */
    error OwnerQueryForNonexistentToken(uint256 tokenId);

    /**
     * @dev Thrown when querying for the operator of a token that has not been minted yet.
     */
    error OperatorQueryForNonexistentToken(uint256 tokenId);

    /**
     * @dev Thrown when attempting to safeTransfer to a contract that cannot handle ERC721 tokens.
     */
    error TransferToNonERC721ReceiverImplementer(address to);

    /**
     * @dev Thrown when minting to the address(0).
     */
    error MintToTheZeroAddress();

    /**
     * @dev Thrown when minting a token that already exists.
     */
    error TokenIsAlreadyMinted(uint256 tokenId);

    /**
     * @dev Thrown transferring a token to the address(0).
     */
    error TransferToTheZeroAddress();

    /**
     * @dev Thrown when calling a method that has been purposely disabled.
     */
    error MethodNotAllowed();

    /**
     * @dev Mint new tokens.
     * @param to The address to mint the token to.
     * @param tokenId The ID of the token to mint.
     * @param data The data to send over to the receiver if it supports `onERC721Received` hook.
     */
    function mint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) external;
}
