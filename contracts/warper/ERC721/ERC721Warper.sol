// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC721Metadata.sol";
import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import "../Warper.sol";
import "./IERC721Warper.sol";
import "../../metahub/IMetahub.sol";

error BalanceQueryForZeroAddress();
error OwnerQueryForNonexistentToken(uint256 tokenId);
error OperatorQueryForNonexistentToken(uint256 tokenId);
error ApprovalToCurrentOwner(address owner);
error ApproveCallerIsNotOwnerNorApprovedForAll(address caller);
error ApprovedQueryForNonexistentToken(uint256 tokenId);
error TransferCallerIsNotOwnerNorApproved(address caller);
error TransferToNonERC721ReceiverImplementer(address to);
error MintToTheZeroAddress();
error TokenIsAlreadyMinted(uint256 tokenId);
error TransferOfTokenThatIsNotOwn(uint256 tokenId);
error TransferToTheZeroAddress();
error ApproveToCaller();

contract ERC721Warper is Warper, IERC721Warper {
    using ERC165Checker for address;
    using Address for address;

    bytes4 internal constant _ERC721METADATA_INTERFACE_ID = type(IERC721Metadata).interfaceId;

    /**
     * @dev Mapping from token ID to owner address
     */
    mapping(uint256 => address) private _owners;

    /**
     * @dev Mapping from token ID to approved address
     */
    mapping(uint256 => address) private _tokenApprovals;

    /**
     * @dev Mapping from owner to operator approvals
     */
    mapping(address => mapping(address => bool)) private _operatorApprovals;

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

        return IMetahub(_metahub()).getActiveWarperRentalCount(address(this), owner);
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
            address metahubAddress = _metahub();
            IMetahub.WarperRentalStatus rentalStatus = IMetahub(metahubAddress).getWarperRentalStatus(
                address(this),
                tokenId
            );
            if (rentalStatus == IMetahub.WarperRentalStatus.NOT_MINTED) revert OwnerQueryForNonexistentToken(tokenId);
            if (rentalStatus == IMetahub.WarperRentalStatus.MINTED) return metahubAddress;
        }

        // `rentalStatus` is now WarperRentalStatus.RENTED
        // Fallback to using the internal owner tracker
        address owner = _owners[tokenId];
        if (owner == address(0)) revert OwnerQueryForNonexistentToken(tokenId);

        return owner;
    }

    /**
     * @inheritdoc IERC721
     */
    function approve(address to, uint256 tokenId) public virtual override {
        address owner = ERC721Warper.ownerOf(tokenId);
        if (to == owner) revert ApprovalToCurrentOwner(owner);

        if (_msgSender() != owner && !isApprovedForAll(owner, _msgSender())) {
            revert ApproveCallerIsNotOwnerNorApprovedForAll(_msgSender());
        }

        _approve(to, tokenId);
    }

    /**
     * @inheritdoc IERC721
     */
    function getApproved(uint256 tokenId) public view virtual override returns (address) {
        if (!_exists(tokenId)) revert ApprovedQueryForNonexistentToken(tokenId);

        return _tokenApprovals[tokenId];
    }

    /**
     * @inheritdoc IERC721
     */
    function setApprovalForAll(address operator, bool approved) public virtual override {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /**
     * @inheritdoc IERC721
     */
    function isApprovedForAll(address owner, address operator) public view virtual override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    /**
     * @inheritdoc IERC721
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public virtual override {
        if (!_isApprovedOrOwner(_msgSender(), tokenId)) {
            revert TransferCallerIsNotOwnerNorApproved(_msgSender());
        }

        _transfer(from, to, tokenId);
    }

    /**
     * @inheritdoc IERC721
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
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public virtual override {
        if (!_isApprovedOrOwner(_msgSender(), tokenId)) revert TransferCallerIsNotOwnerNorApproved(_msgSender());

        _safeTransfer(from, to, tokenId, _data);
    }

    /**
     * @dev Validates the original NFT.
     */
    function _validateOriginal(address original) internal override {
        if (!original.supportsInterface(_ERC721METADATA_INTERFACE_ID)) {
            revert InvalidOriginalTokenInterface(original, _ERC721METADATA_INTERFACE_ID);
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
     * @dev Returns whether `spender` is allowed to manage `tokenId`.
     *
     * Requirements:
     *
     * - `tokenId` must exist.
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool) {
        if (!_exists(tokenId)) revert OperatorQueryForNonexistentToken(tokenId);
        address owner = ERC721Warper.ownerOf(tokenId);

        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    /**
     * @dev Safely mints `tokenId` and transfers it to `to`.
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - If `to` refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.
     *
     * Emits a {Transfer} event.
     */
    function safeMint(address to, uint256 tokenId) public onlyMetahub {
        // todo: custom method?
        _mint(to, tokenId, "");
    }

    /**
     * @dev Same as `_mint`, with an additional `data` parameter which is
     * forwarded in {IERC721Receiver-onERC721Received} to contract recipients.
     */
    function _mint(
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal virtual {
        if (to == address(0)) revert MintToTheZeroAddress();
        if (_exists(tokenId)) revert TokenIsAlreadyMinted(tokenId);

        _beforeTokenTransfer(address(0), to, tokenId);

        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);

        if (!_checkOnERC721Received(address(0), to, tokenId, _data)) {
            revert TransferToNonERC721ReceiverImplementer(to);
        }
    }

    /**
     * @dev Transfers `tokenId` from `from` to `to`.
     *  As opposed to {transferFrom}, this imposes no restrictions on msg.sender.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     *
     * Emits a {Transfer} event.
     */
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        if (ERC721Warper.ownerOf(tokenId) != from) revert TransferOfTokenThatIsNotOwn(tokenId);
        if (to == address(0)) revert TransferToTheZeroAddress();

        _beforeTokenTransfer(from, to, tokenId);

        // Clear approvals from the previous owner
        _approve(address(0), tokenId);

        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev Approve `to` to operate on `tokenId`
     *
     * Emits a {Approval} event.
     */
    function _approve(address to, uint256 tokenId) internal virtual {
        _tokenApprovals[tokenId] = to;
        emit Approval(ERC721Warper.ownerOf(tokenId), to, tokenId);
    }

    /**
     * @dev Approve `operator` to operate on all of `owner` tokens
     *
     * Emits a {ApprovalForAll} event.
     */
    function _setApprovalForAll(
        address owner,
        address operator,
        bool approved
    ) internal virtual {
        if (owner == operator) revert ApproveToCaller();
        _operatorApprovals[owner][operator] = approved;
        emit ApprovalForAll(owner, operator, approved);
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
    ) internal virtual {
        //todo Transfer rental agreement as well here (?)
    }
}
