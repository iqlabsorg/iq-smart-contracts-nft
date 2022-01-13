// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "./Warper.sol";
import "./interfaces/IMetahub.sol";
import "./interfaces/IWarper.sol";
import "./interfaces/IWarperPresetFactory.sol";
import "./ERC721Warper.sol";
import "hardhat/console.sol";

contract Metahub is IMetahub {
    using ERC165Checker for address;

    address private _warperPresetFactory;

    constructor(address warperPresetFactory) {
        _warperPresetFactory = warperPresetFactory;
    }

    /**
     * @inheritdoc IMetahub
     */
    function getWarperPresetFactory() external view returns (address) {
        return _warperPresetFactory;
    }

    /**
     * @inheritdoc IMetahub
     */
    function deployWarper(bytes32 presetId, address original) external returns (address) {
        // Build warper initialization payload.
        bytes[] memory initData = new bytes[](1);
        // Always call abstract warper initialization method first.
        initData[0] = abi.encodeWithSelector(IWarper.iqInitialize.selector, abi.encode(original, address(this)));
        // Ask warper preset factory to deploy new warper instance from preset.
        address warper = IWarperPresetFactory(_warperPresetFactory).deployPreset(presetId, initData);

        emit WarperDeployed(original, warper);

        return warper;
    }
}
