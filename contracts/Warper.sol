// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IWarper.sol";

// todo: add proxy safe ReentrancyGuard
abstract contract Warper is IWarper, Context, ERC165 {
    // This is the keccak-256 hash of "iq.protocol.nft.original" subtracted by 1
    bytes32 private constant _ORIGINAL_SLOT = 0x855a0282585e35fc8dbb4da2088acdbe4b69460635994619e934d7c30b91f660;

    // This is the keccak-256 hash of "iq.protocol.nft.metahub" subtracted by 1
    bytes32 private constant _METAHUB_SLOT = 0x2895cf34325a86852c4193be2ddd0c51203a8222624bba8bf79259901261534f;

    /**
     * @dev Thrown when the original NFT does not implement the interface, expected by Wrapping.
     */
    error InvalidOriginalTokenInterface(address original, bytes4 expectedInterfaceId);
    error InvalidMetaHub(address got, address expected);

    modifier onlyMetaHub() {
        address metaHubAddress = iqMetaHub();
        if (msg.sender != metaHubAddress) {
            revert InvalidMetaHub(msg.sender, metaHubAddress);
        }

        _;
    }

    /**
     * @dev Base Warper initializer.
     *
     * If overridden should call `super.iqInitialize()`.
     */
    function iqInitialize(bytes calldata config) external virtual {
        //todo: consider initializer modifier
        // Decode config
        (address original, address metaHub) = abi.decode(config, (address, address));

        assert(_ORIGINAL_SLOT == bytes32(uint256(keccak256("iq.protocol.nft.original")) - 1));
        assert(_METAHUB_SLOT == bytes32(uint256(keccak256("iq.protocol.nft.metahub")) - 1));
        _validateOriginal(original); //todo: force?
        StorageSlot.getAddressSlot(_ORIGINAL_SLOT).value = original;
        StorageSlot.getAddressSlot(_METAHUB_SLOT).value = metaHub;
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IWarper).interfaceId || ERC165.supportsInterface(interfaceId);
    }

    /**
     * @dev Returns the original NFT address.
     */
    function iqOriginal() public view returns (address) {
        return StorageSlot.getAddressSlot(_ORIGINAL_SLOT).value;
    }

    /**
     * @inheritdoc IWarper
     */
    function iqMetaHub() public view returns (address) {
        return StorageSlot.getAddressSlot(_METAHUB_SLOT).value;
    }

    /**
     * @dev Forwards the current call to `target`.
     *
     * This function does not return to its internal call site, it will return directly to the external caller.
     */
    function _forward(address target) internal {
        uint256 value = msg.value;
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Call the target.
            // out and outsize are 0 for now, as we don't know the out size yet.
            let result := call(gas(), target, value, 0, calldatasize(), 0, 0)

            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())

            switch result
            // call returns 0 on error.
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    /**
     * @dev Forwards the current call to the address returned by `iqOriginal()`.
     *
     * This function does not return to its internal call site, it will return directly to the external caller.
     */
    function _fallback() internal virtual {
        _beforeFallback();
        _forward(iqOriginal());
    }

    /**
     * @dev Fallback function that forwards calls to the address returned by `iqOriginal()`. Will run if no other
     * function in the contract matches the call data.
     */
    fallback() external payable virtual {
        // todo: nonReentrant?
        _fallback();
    }

    /**
     * @dev Fallback function that forwards calls to the address returned by `iqOriginal()`. Will run if call data
     * is empty.
     */
    receive() external payable virtual {
        // todo: nonReentrant?
        _fallback();
    }

    /**
     * @dev Hook that is called before falling back to the original. Can happen as part of a manual `_fallback`
     * call, or as part of the Solidity `fallback` or `receive` functions.
     *
     * If overridden should call `super._beforeFallback()`.
     */
    function _beforeFallback() internal virtual {}

    /**
     * @dev Validates the original NFT.
     *
     * If overridden should call `super._validateOriginal()`.
     */
    function _validateOriginal(address original) internal virtual {}
}
