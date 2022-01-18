// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "./interfaces/IMetahub.sol";
import "./interfaces/IWarper.sol";
import "./interfaces/IWarperPresetFactory.sol";
import "./interfaces/IUniverseToken.sol";

contract Metahub is IMetahub, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using ERC165CheckerUpgradeable for address;

    IWarperPresetFactory private _warperPresetFactory;
    IUniverseToken private _universeToken;

    /**
     * @dev Metahub initializer.
     * @param warperPresetFactory Warper preset factory address.
     */
    function initialize(address warperPresetFactory, address universeToken) public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init();

        _warperPresetFactory = IWarperPresetFactory(warperPresetFactory);
        _universeToken = IUniverseToken(universeToken);
    }

    /**
     * @dev Checks whether the caller is authorized to upgrade the Metahub implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @inheritdoc IMetahub
     */
    function warperPresetFactory() external view returns (address) {
        return address(_warperPresetFactory);
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
        address warper = _warperPresetFactory.deployPreset(presetId, initData);

        emit WarperDeployed(original, warper);

        return warper;
    }

    /**
     * @inheritdoc IMetahub
     */
    function createUniverse(string calldata name) external returns (uint256) {
        uint256 tokenId = _universeToken.mint(_msgSender(), name);
        emit UniverseCreated(name, tokenId);

        return tokenId;
    }
}
