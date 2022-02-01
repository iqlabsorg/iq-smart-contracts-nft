// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/StorageSlot.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../Errors.sol";
import "./IWarper.sol";
import "./utils/InitializationContext.sol";
import "./utils/CallForwarder.sol";
import "./utils/WarperContext.sol";
import "./params/RentalParamStore.sol";

abstract contract Warper is IWarper, WarperContext, CallForwarder, RentalParamStore {
    using ERC165Checker for address;

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
     * @dev Base Warper initializer.
     *
     * If overridden should call `super.__initialize()`.
     */
    function __initialize(bytes calldata config) external virtual initializer {
        // Decode config
        (address original, address metahub) = abi.decode(config, (address, address));

        _validateOriginal(original);
        _setOriginal(original);
        _setMetahub(metahub);
    }

    /**
     * @inheritdoc IRentalParamStore
     */
    function __setMinRentalPeriod(uint256 minRentalPeriod) external virtual onlyWarperAdmin {
        _setMinRentalPeriod(minRentalPeriod);
    }

    /**
     * @inheritdoc IRentalParamStore
     */
    function __setMaxRentalPeriod(uint256 maxRentalPeriod) external virtual onlyWarperAdmin {
        _setMaxRentalPeriod(maxRentalPeriod);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) external view virtual returns (bool) {
        bool supportedByWarper = interfaceId == type(IWarper).interfaceId || interfaceId == type(IERC165).interfaceId;
        if (supportedByWarper) return true;

        address original = _original();
        return original.supportsERC165() ? original.supportsInterface(interfaceId) : false;
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
     * @inheritdoc IRentalParamStore
     */
    function __minRentalPeriod() external view virtual returns (uint256) {
        return _minRentalPeriod();
    }

    /**
     * @inheritdoc IRentalParamStore
     */
    function __maxRentalPeriod() external view virtual returns (uint256) {
        uint256 value = _maxRentalPeriod();
        return value > 0 ? value : type(uint256).max;
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
    function _beforeFallback() internal virtual {}

    /**
     * @dev Validates the original NFT.
     *
     * If overridden should call `super._validateOriginal()`.
     */
    function _validateOriginal(address original) internal virtual {}
}
