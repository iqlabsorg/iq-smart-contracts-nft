// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../../asset/ERC721/ERC721AssetController.sol";
import "../IWarperController.sol";
import "./IERC721Warper.sol";

contract ERC721WarperController is IWarperController, ERC721AssetController {
    /**
     * @notice The supported Warpers interface
     */
    bytes4 public constant SUPPORTED_WARPER_INTERFACE = type(IERC721Warper).interfaceId;

    /**
     * @inheritdoc IWarperController
     */
    function isCompatibleWarper(IWarper warper) external view returns (bool) {
        return warper.supportsInterface(SUPPORTED_WARPER_INTERFACE);
    }

    /**
     * @inheritdoc IWarperController
     */
    function checkIsRentableAsset(Assets.Asset calldata asset, Rentings.Params calldata rentingParams) external view {
        // todo: analyse warper mechanics (use supportsInterfaces from ERC165Checker)
        //todo: call warper checkAssetRentable mechanics (false, error message)
        // todo: revert AssetNotRentable(error)
        //todo: check warper availability period (if supported)
        //todo: check warper min/max rental period (if supported)
    }

    /**
     * @inheritdoc IWarperController
     */
    function calculatePremiums(
        Assets.Asset calldata asset,
        Rentings.Params calldata rentingParams,
        uint256 universeFee,
        uint256 listerFee
    ) external view returns (uint256 universePremium, uint256 listerPremium) {
        // todo: check interface support, call warper or fallback to (0, 0)
        return (0, 0);
    }
}
