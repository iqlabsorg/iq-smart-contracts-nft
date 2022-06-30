// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity ^0.8.13;

import "../IListingController.sol";
import "../../asset/Assets.sol";

interface IFixedPriceWithRewardListingController is IListingController {
    /**
     * @dev Defines lister reward percentage for specific listing.
     * @param listingId The listing ID.
     * @param rewardPercentage Lister reward percentage for certain listing.
     */
    function setListerRewardForListing(uint256 listingId, uint8 rewardPercentage) external;

    /**
     * @dev Defines lister reward percentage for specific warper.
     * @param listingId The listing ID.
     * @param warper Warper address.
     * @param rewardPercentage Lister reward percentage for certain warper.
     */
    function setListerRewardForWarper(
        uint256 listingId,
        address warper,
        uint8 rewardPercentage
    ) external;

    /**
     * @dev Defines lister reward percentage for specific universe.
     * @param listingId The listing ID.
     * @param universeId The universe ID.
     * @param rewardPercentage Lister reward percentage for certain universe.
     */
    function setListerRewardForUniverse(
        uint256 listingId,
        uint256 universeId,
        uint8 rewardPercentage
    ) external;

    /**
     * @dev Defines universe reward percentage for specific listing.
     * @param universeId The universe ID.
     * @param listingId The listing ID.
     * @param rewardPercentage Universe reward percentage for certain listing.
     */
    function setUniverseRewardForListing(
        uint256 universeId,
        uint256 listingId,
        uint8 rewardPercentage
    ) external;

    /**
     * @dev Defines universe reward for specific warper.
     * @param universeId The universe ID.
     * @param warper Warper address.
     * @param rewardPercentage Universe reward percentage for certain warper.
     */
    function setUniverseRewardForWarper(
        uint256 universeId,
        address warper,
        uint8 rewardPercentage
    ) external;

    /**
     * @dev Defines global universe reward percentage.
     * @param universeId The universe ID.
     * @param rewardPercentage Global universe reward percentage.
     */
    function setUniverseReward(uint256 universeId, uint8 rewardPercentage) external;

    /**
     * @dev Defines protocol reward percentage for certain listing.
     * @param listingId The listing ID.
     * @param rewardPercentage Protocol reward percentage for certain listing.
     */
    function setProtocolRewardForListing(uint256 listingId, uint8 rewardPercentage) external;

    /**
     * @dev Defines protocol reward percentage for certain warper.
     * @param warper Warper address.
     * @param rewardPercentage Protocol reward percentage for certain warper.
     */
    function setProtocolRewardForWarper(address warper, uint8 rewardPercentage) external;

    /**
     * @dev Defines protocol reward percentage for certain warper.
     * @param universeId The universe ID.
     * @param rewardPercentage Protocol reward percentage for certain warper.
     */
    function setProtocolRewardForUniverse(uint256 universeId, uint8 rewardPercentage) external;

    /**
     * @dev Defines protocol reward percentage for certain warper.
     * @param rewardPercentage Global protocol reward percentage.
     */
    function setProtocolReward(uint8 rewardPercentage) external;

    /**
     * @dev Returns the reward percentages allocation for lister, universe, protocol.
     * @param warpedAssetId The listing ID.
     * @param rentalId The listing ID.
     * @return rewardReceivers Array of reward receivers.
     * @return distributionPercentages Array of rewarding percentages.
     */
    function getRewardAllocations(Assets.AssetId calldata warpedAssetId, uint256 rentalId)
        external
        view
        returns (address[] memory rewardReceivers, uint8[] memory distributionPercentages);

    /**
     * @inheritdoc IListingController
     */
    function calculateRentalFee(Listings.Params calldata strategyParams, Rentings.Params calldata rentingParams)
        external
        pure
        returns (uint256);
}
