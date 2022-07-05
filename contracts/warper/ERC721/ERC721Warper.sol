// SPDX-License-Identifier: MIT
// solhint-disable ordering
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC721Metadata.sol";
import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import "../../metahub/IMetahub.sol";
import "../../renting/Rentings.sol";
import "../Warper.sol";
import "./IERC721Warper.sol";
import "./IERC721WarperController.sol";

/**
 * @title Warper for the ERC721 token contract
 */
abstract contract ERC721Warper is IERC721Warper, Warper {
    using ERC165Checker for address;
    using Address for address;

    /**
     * @dev Mapping from token ID to owner address
     */
    mapping(uint256 => address) private _owners;

    /**
     * @inheritdoc IWarper
     */
    // solhint-disable-next-line private-vars-leading-underscore
    function __assetClass() external pure returns (bytes4) {
        return Assets.ERC721;
    }

    /**
     * @inheritdoc IERC721
     * @dev Method is disabled, kept only for interface compatibility purposes.
     */
    function setApprovalForAll(address, bool) external virtual {
        revert MethodNotAllowed();
    }

    /**
     * @inheritdoc IERC721
     * @dev Method is disabled, kept only for interface compatibility purposes.
     */
    function approve(address, uint256) external virtual {
        revert MethodNotAllowed();
    }

    /**
     * @dev Safely mints `tokenId` and transfers it to `to`.
     *
     * Requirements:
     *
     * - needs to pass validation of `_beforeTokenTransfer()`.
     * - `tokenId` must not exist.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received},
     * which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function mint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) external {
        if (to == address(0)) revert MintToTheZeroAddress();
        if (_exists(tokenId)) revert TokenIsAlreadyMinted(tokenId);

        _beforeTokenTransfer(address(0), to, tokenId);

        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);

        if (!_checkOnERC721Received(address(0), to, tokenId, data)) {
            revert TransferToNonERC721ReceiverImplementer(to);
        }
    }

    /**
     * @inheritdoc IERC721
     *
     * @dev Need to fulfill all the requirements of `_transfer()`
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external {
        _transfer(from, to, tokenId);
    }

    /**
     * @inheritdoc IERC721
     *
     * @dev Need to fulfill all the requirements of `_transfer()`
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public {
        safeTransferFrom(from, to, tokenId, "");
    }

    /**
     * @inheritdoc IERC721
     *
     * @dev Need to fulfill all the requirements of `_transfer()`
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public {
        _safeTransfer(from, to, tokenId, data);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(Warper, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721Warper).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IERC721
     * @dev The rental count calculations get offloaded to the Metahub
     */
    function balanceOf(address owner) public view returns (uint256) {
        if (owner == address(0)) revert BalanceQueryForZeroAddress();
        IERC721WarperController warperController = _warperController();
        return warperController.rentalBalance(_metahub(), address(this), owner);
    }

    /**
     * @inheritdoc IERC721
     * @dev The ownership is dependant on the rental status - metahub is
     *      responsible for tracking the state:
     *          - NONE: revert with an error
     *          - AVAILABLE: means, that the token is not currently rented. Metahub is the owner.
     *          - RENTED: Use the Warpers internal ownership constructs
     */
    function ownerOf(uint256 tokenId) public view returns (address) {
        // Special rent-sate handling
        {
            Rentings.RentalStatus rentalStatus = _getWarperRentalStatus(tokenId);

            if (rentalStatus == Rentings.RentalStatus.NONE) revert OwnerQueryForNonexistentToken(tokenId);
            if (rentalStatus == Rentings.RentalStatus.AVAILABLE) return _metahub();
        }

        // `rentalStatus` is now RENTED
        // Fallback to using the internal owner tracker
        address owner = _owners[tokenId];
        if (owner == address(0)) revert OwnerQueryForNonexistentToken(tokenId);

        return owner;
    }

    /**
     * @inheritdoc IERC721
     */
    function getApproved(uint256 tokenId) public view returns (address) {
        Rentings.RentalStatus rentalStatus = _getWarperRentalStatus(tokenId);
        if (rentalStatus == Rentings.RentalStatus.NONE) revert OwnerQueryForNonexistentToken(tokenId);

        return _metahub();
    }

    /**
     * @inheritdoc IERC721
     */
    function isApprovedForAll(address, address operator) public view returns (bool) {
        return operator == _metahub();
    }

    /**
     * @dev Validates the original NFT.
     */
    function _validateOriginal(address original) internal virtual override {
        if (!original.supportsInterface(type(IERC721Metadata).interfaceId)) {
            revert InvalidOriginalTokenInterface(original, type(IERC721Metadata).interfaceId);
        }
        super._validateOriginal(original);
    }

    /**
     * @dev ONLY THE METAHUB CAN CALL THIS METHOD.
     *      This validates every single transfer that the warper can perform.
     *      Metahub can be the only source of transfers, so it can properly synchronise
     *      the rental agreement ownership.
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
     * transferred to `to`.
     * - When `from` is zero, `tokenId` will be minted for `to`.
     * - When `to` is zero, ``from``'s `tokenId` will be burned.
     * - `from` and `to` are never both zero.
     *
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal onlyMetahub {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * `data` is additional data, it has no specified format and it is sent in call to `to`.
     *
     * This internal function is equivalent to {safeTransferFrom}, and can be used to e.g.
     * implement alternative mechanisms to perform token transfer, such as signature-based.
     *
     * Requirements:
     *
     * - Needs to fulfill all the requirements of `_transfer()`
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must exist and be owned by `from`.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received},
     * which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal {
        _transfer(from, to, tokenId);
        if (!_checkOnERC721Received(from, to, tokenId, data)) {
            revert TransferToNonERC721ReceiverImplementer(to);
        }
    }

    /**
     * @dev Transfers `tokenId` from `from` to `to`.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - needs to pass validation of `_beforeTokenTransfer()`.
     *
     * Emits a {Transfer} event.
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal {
        if (!_exists(tokenId)) revert OperatorQueryForNonexistentToken(tokenId);
        if (to == address(0)) revert TransferToTheZeroAddress();

        _beforeTokenTransfer(from, to, tokenId);

        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev Returns whether `tokenId` exists.
     *
     * Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.
     *
     * Tokens start existing when they are minted (`_mint`),
     * and stop existing when they are burned (`_burn`).
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _owners[tokenId] != address(0);
    }

    /**
     * @dev Get the associated warper controller.
     */
    function _warperController() internal view returns (IERC721WarperController) {
        return IERC721WarperController(IMetahub(_metahub()).warperManager().warperController(address(this)));
    }

    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        if (!to.isContract()) return true;

        try IERC721Receiver(to).onERC721Received(_msgSender(), from, tokenId, data) returns (bytes4 result) {
            return result == IERC721Receiver.onERC721Received.selector;
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert TransferToNonERC721ReceiverImplementer(to);
            } else {
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }

    /**
     * @dev Get the rental status of a token.
     */
    function _getWarperRentalStatus(uint256 tokenId) private view returns (Rentings.RentalStatus) {
        IERC721WarperController warperController = _warperController();
        return warperController.rentalStatus(_metahub(), address(this), tokenId);
    }
}
