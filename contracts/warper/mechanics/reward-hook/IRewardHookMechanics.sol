// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity ^0.8.13;

import "../renting-hook/IRentingHookMechanics.sol";
import "../../../asset/Assets.sol";

interface IRewardHookMechanics {
    /**
     * @dev Thrown when the reward hook execution failed due to the `reason`.
     */
    error RewardHookError(string reason);

    /**
     * @dev Executes arbitrary logic for reward distribution.
     * NOTE: This function should not revert directly and must set correct `success` value instead.
     *
     * @param warpedAssetId Warped asset ID.
     * @param rentalId The rental ID.
     * @param rewardToken ERC-20 reward token.
     * @param rewardTokenAmount The reward token amount.
     * @return success True if hook was executed successfully.
     * @return errorMessage The reason of the hook execution failure.
     */
    function __onDistribution(
        Assets.AssetId calldata warpedAssetId,
        uint256 rentalId,
        IERC20Upgradeable rewardToken,
        uint256 rewardTokenAmount
    ) external returns (bool success, string memory errorMessage);
}
