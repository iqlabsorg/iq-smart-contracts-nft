// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IMetahub.sol";
import "./interfaces/IWarper.sol";
import "./interfaces/IWarperPresetFactory.sol";

contract Metahub is IMetahub, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using ERC165Checker for address;

    address private _warperPresetFactory;

    /**
     * @dev Metahub initializer.
     * @param warperPresetFactory Warper preset factory address.
     */
    function initialize(address warperPresetFactory) public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();
        _warperPresetFactory = warperPresetFactory;
    }

    /**
     * @dev Checks whether the caller is authorized to upgrade the Metahub implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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
