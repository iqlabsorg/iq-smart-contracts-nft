// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../../extensions/WarperAssetRentability.sol";
import "../../extensions/WarperAvailabilityPeriod.sol";
import "../ERC721Warper.sol";
import "../../IWarperPreset.sol";

contract ERC721PresetConfigurable is IWarperPreset, ERC721Warper, WarperAvailabilityPeriod, WarperAssetRentability {
    function __initialize(bytes calldata config) external virtual initializer {
        // Decode config
        (address original, address metahub) = abi.decode(config, (address, address));
        _Warper_init(original, metahub);
        _WarperAvailabilityPeriod_init();
        _WarperAssetRentability_init();
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Warper, WarperAvailabilityPeriod, WarperAssetRentability, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IWarperPreset).interfaceId ||
            ERC721Warper.supportsInterface(interfaceId) ||
            WarperAvailabilityPeriod.supportsInterface(interfaceId) ||
            WarperAssetRentability.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc ERC721Warper
     */
    function _validateOriginal(address original) internal virtual override(ERC721Warper, Warper) {
        return ERC721Warper._validateOriginal(original);
    }
}
