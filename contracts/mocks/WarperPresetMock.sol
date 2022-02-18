// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../warper/Warper.sol";
import "../warper/IWarperPreset.sol";

contract WarperPresetMock is IWarperPreset, Warper {
    uint256 internal _initValue;
    uint256 internal _extraValue;

    function __initialize(bytes calldata config) external initializer {
        (address original, address metahub, bytes memory presetData) = abi.decode(config, (address, address, bytes));

        (uint256 initValue1, uint256 initValue2) = abi.decode(presetData, (uint256, uint256));
        _Warper_init(original, metahub);
        _initValue = initValue1 + initValue2;
    }

    function __assetClass() external pure returns (bytes4) {
        return "";
    }

    function initValue() external view returns (uint256) {
        return _initValue;
    }

    function setExtraValue(uint256 extraValue) external {
        _extraValue = extraValue;
    }

    function extraValue() external view returns (uint256) {
        return _extraValue;
    }

    function supportsInterface(bytes4 interfaceId) public view override(Warper, IERC165) returns (bool) {
        return interfaceId == type(IWarperPreset).interfaceId || super.supportsInterface(interfaceId);
    }
}
