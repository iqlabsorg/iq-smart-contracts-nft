// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity 0.8.13;

import "../ERC721Warper.sol";
import "../../IWarperPreset.sol";
import "../../mechanics/availability-period/ConfigurableAvailabilityPeriodExtension.sol";
import "../../mechanics/rental-period/ConfigurableRentalPeriodExtension.sol";

contract ERC721PresetConfigurable is
    IWarperPreset,
    ERC721Warper,
    ConfigurableAvailabilityPeriodExtension,
    ConfigurableRentalPeriodExtension
{
    /**
     * @inheritdoc IWarperPreset
     */
    function __initialize(bytes calldata config) external virtual initializer {
        // Decode config
        (address original, address metahub) = abi.decode(config, (address, address));
        _Warper_init(original, metahub);
        _ConfigurableAvailabilityPeriodExtension_init();
        _ConfigurableRentalPeriodExtension_init();
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Warper, ConfigurableAvailabilityPeriodExtension, ConfigurableRentalPeriodExtension, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IWarperPreset).interfaceId ||
            ERC721Warper.supportsInterface(interfaceId) ||
            ConfigurableAvailabilityPeriodExtension.supportsInterface(interfaceId) ||
            ConfigurableRentalPeriodExtension.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc ERC721Warper
     */
    function _validateOriginal(address original) internal virtual override(ERC721Warper, Warper) {
        return ERC721Warper._validateOriginal(original);
    }
}
