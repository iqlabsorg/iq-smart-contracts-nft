// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../Errors.sol";
import "./IAssetController.sol";
import "./IAssetVault.sol";

library Assets {
    using Address for address;
    using Assets for Registry;
    using Assets for Asset;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /*
     * @dev This is the list of asset class identifiers to be used across the system.
     */
    bytes4 public constant ERC20 = bytes4(keccak256("ERC20"));
    bytes4 public constant ERC721 = bytes4(keccak256("ERC721"));
    bytes4 public constant ERC1155 = bytes4(keccak256("ERC1155"));

    bytes32 public constant ASSET_ID_TYPEHASH = keccak256("AssetId(bytes4 assetClass,bytes data)");

    bytes32 public constant ASSET_TYPEHASH =
        keccak256("Asset(AssetType assetType,uint256 value)AssetId(bytes4 assetClass,bytes data)");

    /**
     * @dev Thrown upon attempting to register an asset class twice.
     * @param assetClass Duplicate asset class ID.
     */
    error AssetClassIsAlreadyRegistered(bytes4 assetClass);

    /**
     * @dev Thrown when the asset class is not registered or deprecated.
     * @param assetClass Asset class ID.
     */
    error UnsupportedAssetClass(bytes4 assetClass);

    /**
     * @dev Thrown when there are no registered warpers for a particular asset.
     * @param asset Asset address.
     */
    error UnsupportedAsset(address asset);

    /**
     * @dev Communicates asset identification information.
     * The structure designed to be token-standard agnostic, so the layout of `data` might vary for different token standards.
     * For example, in case of ERC20 token, the `data` will contain contract address only,
     * and for ERC721 it will include both contract address and tokenId.
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
     * @param warpers Set of warper addresses registered for the asset.
     */
    struct Info {
        IAssetController controller;
        IAssetVault vault;
        EnumerableSetUpgradeable.AddressSet warpers;
    }

    /**
     * @dev Asset class configuration.
     * @param controller Asset class controller.
     * @param vault Asset class vault.
     */
    struct ClassConfig {
        IAssetVault vault;
        address controller;
    }

    /**
     * @dev Asset registry.
     * @param classes Mapping from asset class ID to the asset class configuration.
     * @param assets Mapping from asset address to the asset details.
     */
    struct Registry {
        mapping(bytes4 => ClassConfig) classes;
        mapping(address => Info) assets;
    }

    /**
     * @dev Registers new asset.
     */
    function addAsset(
        Registry storage self,
        bytes4 assetClass,
        address asset
    ) internal {
        self.assets[asset].vault = self.classes[assetClass].vault;
        self.assets[asset].controller = IAssetController(self.classes[assetClass].controller);
    }

    /**
     * @dev Checks asset registration by address.
     * The registered asset must have controller.
     */
    function isRegisteredAsset(Registry storage self, address asset) internal view returns (bool) {
        return address(self.assets[asset].controller) != address(0);
    }

    /**
     * @dev Checks asset support by address.
     * The supported asset should have at least one warper.
     * @param asset Asset address.
     */
    function isSupportedAsset(Registry storage self, address asset) internal view returns (bool) {
        return self.assets[asset].warpers.length() > 0;
    }

    /**
     * @dev Throws if asset is not supported.
     * @param asset Asset address.
     */
    function checkAssetSupport(Registry storage self, address asset) internal view {
        if (!self.isSupportedAsset(asset)) revert UnsupportedAsset(asset);
    }

    /**
     * @dev Throws if asset class is not supported.
     * @param assetClass Asset class ID.
     */
    function checkAssetClassSupport(Registry storage self, bytes4 assetClass) internal view {
        if (!self.isRegisteredAssetClass(assetClass)) revert UnsupportedAssetClass(assetClass);
    }

    /**
     * @dev Checks asset class support.
     * @param assetClass Asset class ID.
     */
    function isRegisteredAssetClass(Registry storage self, bytes4 assetClass) internal view returns (bool) {
        // The registered asset must have controller.
        return address(self.classes[assetClass].controller) != address(0);
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
        address token = asset.token();
        self.checkAssetSupport(token); //todo: check this before calling the function

        // Transfer asset to the class asset specific vault.
        address assetController = address(self.assets[token].controller);
        address assetVault = address(self.assets[token].vault);
        assetController.functionDelegateCall(
            abi.encodeWithSelector(IAssetController.transferAssetToVault.selector, asset, from, assetVault)
        );
    }

    /**
     * @dev Transfers an asset from the vault using associated controller.
     */
    function returnAssetFromVault(Registry storage self, Assets.Asset memory asset) internal {
        address token = asset.token();
        address assetController = address(self.assets[token].controller);
        address assetVault = address(self.assets[token].vault);

        assetController.functionDelegateCall(
            abi.encodeWithSelector(IAssetController.returnAssetFromVault.selector, asset, assetVault)
        );
    }

    //todo: docs
    function addAssetClass(
        Registry storage self,
        bytes4 assetClass,
        ClassConfig memory classConfig
    ) internal {
        //todo: validate interfaces
        if (self.isRegisteredAssetClass(assetClass)) revert AssetClassIsAlreadyRegistered(assetClass);
        self.classes[assetClass] = classConfig;
    }

    //todo: docs
    function setAssetClassVault(
        Registry storage self,
        bytes4 assetClass,
        address vault
    ) internal {
        bytes4 vaultAssetClass = IAssetVault(vault).assetClass();
        if (vaultAssetClass != assetClass) revert AssetClassMismatch(vaultAssetClass, assetClass);
        self.classes[assetClass].vault = IAssetVault(vault);
    }

    //todo: docs
    function setAssetClassController(
        Registry storage self,
        bytes4 assetClass,
        address controller
    ) internal {
        bytes4 controllerAssetClass = IAssetController(controller).assetClass();
        if (controllerAssetClass != assetClass) revert AssetClassMismatch(controllerAssetClass, assetClass);
        self.classes[assetClass].controller = controller;
    }
}
