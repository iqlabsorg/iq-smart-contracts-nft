// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../extensions/ERC721WarperConfigurable.sol";
import "../../IWarperPreset.sol";

contract ERC721PresetConfigurable is ERC721WarperConfigurable, IWarperPreset {
    function __initialize(bytes calldata config) external virtual initializer {
        // Decode config
        (address original, address metahub) = abi.decode(config, (address, address));
        _Warper_init(original, metahub);
        _ERC721WarperConfigurable_init();
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721WarperConfigurable, IERC165)
        returns (bool)
    {
        return interfaceId == type(IWarperPreset).interfaceId || super.supportsInterface(interfaceId);
    }
}
