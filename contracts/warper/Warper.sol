// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore, func-name-mixedcase
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "./IWarper.sol";
import "./utils/CallForwarder.sol";
import "./utils/WarperContext.sol";

abstract contract Warper is IWarper, WarperContext, CallForwarder, Multicall {
    using ERC165Checker for address;

    /**
     * @dev Thrown when the original asset contract does not implement the interface, expected by Warper.
     */
    error InvalidOriginalTokenInterface(address original, bytes4 requiredInterfaceId);

    /**
     * @dev Forwards the current call to the original asset contract. Will run if call data
     * is empty.
     */
    receive() external payable virtual {
        _fallback();
    }

    /**
     * @dev Forwards the current call to the original asset contract`. Will run if no other
     * function in the contract matches the call data.
     */
    fallback() external payable virtual {
        _fallback();
    }

    /**
     * @dev Warper initializer.
     *
     */
    function _Warper_init(address original, address metahub) internal onlyInitializingWarper {
        _validateOriginal(original);
        _setOriginal(original);
        _setMetahub(metahub);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165) returns (bool) {
        return
            interfaceId == type(IWarper).interfaceId ||
            interfaceId == type(IERC165).interfaceId ||
            _original().supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IWarper
     */
    function __supportedInterfaces(bytes4[] memory interfaceIds) external view returns (bool[] memory) {
        return address(this).getSupportedInterfaces(interfaceIds);
    }

    /**
     * @dev Returns the original NFT address.
     */
    function __original() external view returns (address) {
        return _original();
    }

    /**
     * @inheritdoc IWarper
     */
    function __metahub() external view returns (address) {
        return _metahub();
    }

    /**
     * @dev Forwards the current call to the original asset contract`.
     *
     * This function does not return to its internal call site, it will return directly to the external caller.
     */
    function _fallback() internal virtual {
        _beforeFallback();
        _forward(_original());
    }

    /**
     * @dev Hook that is called before falling back to the original. Can happen as part of a manual `_fallback`
     * call, or as part of the Solidity `fallback` or `receive` functions.
     *
     * If overridden should call `super._beforeFallback()`.
     */
    function _beforeFallback() internal virtual {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Validates the original NFT.
     *
     * If overridden should call `super._validateOriginal()`.
     */
    function _validateOriginal(address original) internal virtual {
        // solhint-disable-previous-line no-empty-blocks
    }
}
