// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "../IWarper.sol";

interface IERC721Warper is IWarper, IERC721 {
    //TODO: Docs
    error BalanceQueryForZeroAddress();
    error OwnerQueryForNonexistentToken(uint256 tokenId);
    error OperatorQueryForNonexistentToken(uint256 tokenId);
    error TransferToNonERC721ReceiverImplementer(address to);
    error MintToTheZeroAddress();
    error TokenIsAlreadyMinted(uint256 tokenId);
    error TransferToTheZeroAddress();
    error MethodNotAllowed();

    function mint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) external;
}
