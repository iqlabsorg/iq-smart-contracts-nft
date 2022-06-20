// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../warper/ERC721/presets/ERC721PresetConfigurable.sol";

contract WarperExtendingPreset is ERC721PresetConfigurable, UUPSUpgradeable, OwnableUpgradeable {
    uint8 public initValue;

    function __initialize(bytes calldata config) public virtual override initializer warperInitializer {
        super.__initialize(config);
        __Ownable_init();

        (, , uint8 _initValue) = abi.decode(config, (address, address, uint8));
        initValue = _initValue;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {
        // solhint-disable-previous-line no-empty-blocks
    }

    // NOTE: override because we inherit both - OZ Upgradeable and non upgradeable context
    function _msgData() internal view virtual override(Context, ContextUpgradeable) returns (bytes calldata) {
        return ContextUpgradeable._msgData();
    }

    // NOTE: override because we inherit both - OZ Upgradeable and non upgradeable context
    function _msgSender() internal view virtual override(Context, ContextUpgradeable) returns (address) {
        return ContextUpgradeable._msgSender();
    }
}
