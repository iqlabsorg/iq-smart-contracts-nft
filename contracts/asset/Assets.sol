// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./IAssetController.sol";
import "./IAssetVault.sol";
import "./IAssetClassRegistry.sol";

library Assets {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using Address for address;
    using Assets for Registry;
    using Assets for Asset;

    /*
     * @dev This is the list of asset class identifiers to be used across the system.
     */
    bytes4 public constant ERC721 = bytes4(keccak256("ERC721"));
    bytes4 public constant ERC1155 = bytes4(keccak256("ERC1155"));

    bytes32 public constant ASSET_ID_TYPEHASH = keccak256("AssetId(bytes4 assetClass,bytes data)");

    bytes32 public constant ASSET_TYPEHASH =
        keccak256("Asset(AssetType assetType,uint256 value)AssetId(bytes4 assetClass,bytes data)");

    /**
     * @dev Thrown when the asset class is not registered or deprecated.
     * @param assetClass Asset class ID.
     */
    error UnsupportedAssetClass(bytes4 assetClass);

    /**
     * @dev Thrown upon attempting to register an asset twice.
     * @param asset Duplicate asset address.
     */
    error AssetIsAlreadyRegistered(address asset);

    /**
     * @dev Communicates asset identification information.
     * The structure designed to be token-standard agnostic, so the layout of `data` might vary for different token standards.
     * For example, in case of ERC721 token, the `data` will contain contract address and tokenId.
     * @param class Asset class ID
     * @param data Asset identification data.
     */
    struct AssetId {
        bytes4 class;
        bytes data;
    }

    /**
     * @dev Calculates Asset ID hash
     */
    function hash(AssetId memory assetId) internal pure returns (bytes32) {
        return keccak256(abi.encode(ASSET_ID_TYPEHASH, assetId.class, keccak256(assetId.data)));
    }

    /**
     * @dev Extracts token contract address from the Asset ID structure.
     * The address is the common attribute for all assets regardless of their asset class.
     */
    function token(AssetId memory self) internal pure returns (address) {
        return abi.decode(self.data, (address));
    }

    /**
     * @dev Uniformed structure to describe arbitrary asset (token) and its value.
     * @param id Asset ID structure.
     * @param value Asset value (amount).
     */
    struct Asset {
        AssetId id;
        uint256 value;
    }

    /**
     * @dev Calculates Asset hash
     */
    function hash(Asset memory asset) internal pure returns (bytes32) {
        return keccak256(abi.encode(ASSET_TYPEHASH, hash(asset.id), asset.value));
    }

    /**
     * @dev Extracts token contract address from the Asset structure.
     * The address is the common attribute for all assets regardless of their asset class.
     */
    function token(Asset memory self) internal pure returns (address) {
        return abi.decode(self.id.data, (address));
    }

    /**
     * @dev Original asset data.
     * @param controller Asset controller.
     * @param vault Asset vault.
     */
    struct AssetConfig {
        IAssetController controller;
        IAssetVault vault;
    }

    /**
     * @dev Asset registry.
     * @param classRegistry Asset class registry contract.
     * @param assetIndex Set of registered asset addresses.
     * @param assets Mapping from asset address to the asset configuration.
     */
    struct Registry {
        IAssetClassRegistry classRegistry;
        EnumerableSetUpgradeable.AddressSet assetIndex;
        mapping(address => AssetConfig) assets;
    }

    /**
     * @dev Registers new asset.
     */
    function registerAsset(
        Registry storage self,
        bytes4 assetClass,
        address asset
    ) internal {
        if (self.assetIndex.add(asset)) {
            IAssetClassRegistry.ClassConfig memory assetClassConfig = self.classRegistry.assetClassConfig(assetClass);
            self.assets[asset].vault = IAssetVault(assetClassConfig.vault);
            self.assets[asset].controller = IAssetController(assetClassConfig.controller);
        } else {
            revert AssetIsAlreadyRegistered(asset);
        }
    }

    /**
     * @dev Checks asset registration by address.
     */
    function isRegisteredAsset(Registry storage self, address asset) internal view returns (bool) {
        return self.assetIndex.contains(asset);
    }

    /**
     * @dev Throws if asset class is not supported.
     * @param assetClass Asset class ID.
     */
    function checkSupportedAssetClass(Registry storage self, bytes4 assetClass) internal view {
        if (!self.classRegistry.isRegisteredAssetClass(assetClass)) revert UnsupportedAssetClass(assetClass);
    }

    /**
     * @dev Returns controller for asset class.
     * @param assetClass Asset class ID.
     */
    function assetClassController(Registry storage self, bytes4 assetClass) internal view returns (address) {
        return self.classRegistry.assetClassConfig(assetClass).controller;
    }

    /**
     * @dev Transfers an asset to the vault using associated controller.
     */
    function transferAssetToVault(
        Registry storage self,
        Assets.Asset memory asset,
        address from
    ) internal {
        // Extract token address from asset struct and check whether the asset is supported.
        address assetToken = asset.token();

        // Transfer asset to the class asset specific vault.
        address assetController = address(self.assets[assetToken].controller);
        address assetVault = address(self.assets[assetToken].vault);
        assetController.functionDelegateCall(
            abi.encodeWithSelector(IAssetController.transferAssetToVault.selector, asset, from, assetVault)
        );
    }

    /**
     * @dev Transfers an asset from the vault using associated controller.
     */
    function returnAssetFromVault(Registry storage self, Assets.Asset memory asset) internal {
        address assetToken = asset.token();
        address assetController = address(self.assets[assetToken].controller);
        address assetVault = address(self.assets[assetToken].vault);

        assetController.functionDelegateCall(
            abi.encodeWithSelector(IAssetController.returnAssetFromVault.selector, asset, assetVault)
        );
    }
}
