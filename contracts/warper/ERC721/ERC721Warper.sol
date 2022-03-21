// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC721Metadata.sol";
import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import "../../metahub/IMetahub.sol";
import "../Warper.sol";
import "./IERC721Warper.sol";
import "./IERC721WarperController.sol";

/**
 * @title Warper for the ERC721 token contract
 */
contract ERC721Warper is IERC721Warper, Warper {
    using ERC165Checker for address;
    using Address for address;

    /**
     * @dev Mapping from token ID to owner address
     */
    mapping(uint256 => address) private _owners;

    /**
     * @inheritdoc IWarper
     */
    function __assetClass() external pure returns (bytes4) {
        return Assets.ERC721;
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
    function balanceOf(address owner) public view virtual override returns (uint256) {
        if (owner == address(0)) revert BalanceQueryForZeroAddress();
        IERC721WarperController warperController = _warperController();
        return warperController.activeRentalCount(_metahub(), address(this), owner);
    }

    /**
     * @inheritdoc IERC721
     * @dev The ownership is dependant on the rental status - metahub is
     *      responsible for tracking the state:
     *          - NOT_MINTED: revert with an error
     *          - MINTED: means, that the token is not currently rented. Metahub is the owner.
     *          - RENTED: Use the Warpers internal ownership constructs
     */
    function ownerOf(uint256 tokenId) public view virtual override returns (address) {
        // Special rent-sate handling
        {
            IERC721WarperController warperController = _warperController();
            IRentingManager.RentalStatus rentalStatus = warperController.rentalStatus(
                _metahub(),
                address(this),
                tokenId
            );

            if (rentalStatus == IRentingManager.RentalStatus.NOT_MINTED) revert OwnerQueryForNonexistentToken(tokenId);
            if (rentalStatus == IRentingManager.RentalStatus.MINTED) return _metahub();
        }

        // `rentalStatus` is now WarperRentalStatus.RENTED
        // Fallback to using the internal owner tracker
        address owner = _owners[tokenId];
        if (owner == address(0)) revert OwnerQueryForNonexistentToken(tokenId);

        return owner;
    }

    /**
     * @inheritdoc IERC721
     * @dev Method is disabled, kept only for interface compatibility purposes.
     */
    function approve(address, uint256) public virtual override {
        revert MethodNotAllowed();
    }

    /**
     * @inheritdoc IERC721
     * @dev Method is disabled, kept only for interface compatibility purposes.
     */
    function getApproved(uint256) public view virtual override returns (address) {
        revert MethodNotAllowed();
    }

    /**
     * @inheritdoc IERC721
     * @dev Method is disabled, kept only for interface compatibility purposes.
     */
    function setApprovalForAll(address, bool) public virtual override {
        revert MethodNotAllowed();
    }

    /**
     * @inheritdoc IERC721
     * @dev Method is disabled, kept only for interface compatibility purposes.
     */
    function isApprovedForAll(address, address) public view virtual override returns (bool) {
        revert MethodNotAllowed();
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
    ) public virtual override {
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
    ) public virtual override {
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
        bytes memory _data
    ) public virtual override {
        _safeTransfer(from, to, tokenId, _data);
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
     * @dev Safely transfers `tokenId` token from `from` to `to`, checking first that contract recipients
     * are aware of the ERC721 protocol to prevent tokens from being forever locked.
     *
     * `_data` is additional data, it has no specified format and it is sent in call to `to`.
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
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal virtual {
        _transfer(from, to, tokenId);
        if (!_checkOnERC721Received(from, to, tokenId, _data)) {
            revert TransferToNonERC721ReceiverImplementer(to);
        }
    }

    /**
     * @dev Returns whether `tokenId` exists.
     *
     * Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.
     *
     * Tokens start existing when they are minted (`_mint`),
     * and stop existing when they are burned (`_burn`).
     */
    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _owners[tokenId] != address(0);
    }

    /**
     * @dev Safely mints `tokenId` and transfers it to `to`.
     *
     * Requirements:
     *
     * - needs to pass validation of `_beforeTokenTransfer()`.
     * - `tokenId` must not exist.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function mint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) public {
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
    ) internal virtual {
        if (!_exists(tokenId)) revert OperatorQueryForNonexistentToken(tokenId);
        if (to == address(0)) revert TransferToTheZeroAddress();

        _beforeTokenTransfer(from, to, tokenId);

        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param _data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) private returns (bool) {
        if (!to.isContract()) return true;

        try IERC721Receiver(to).onERC721Received(_msgSender(), from, tokenId, _data) returns (bytes4 result) {
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
    ) internal virtual onlyMetahub {}

    /**
     * @dev Get the associated warper controller.
     */
    function _warperController() internal view returns (IERC721WarperController) {
        address metahubAddress = _metahub();
        Assets.ClassConfig memory assetClassConfig = IMetahub(metahubAddress).assetClassConfig(Assets.ERC721);
        return IERC721WarperController(assetClassConfig.controller);
    }
}
