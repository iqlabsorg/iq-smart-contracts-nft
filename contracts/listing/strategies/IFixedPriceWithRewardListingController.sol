// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity ^0.8.13;

import "../IListingController.sol";

interface IFixedPriceWithRewardListingController is IListingController {
    /**
     * @dev Defines lister reward percentage for specific warper.
     * @param listingId The listing ID.
     * @param warper Warper address.
     * @param percentage Reward base percentage (lister reward for certain warper).
     */
    function setListerWarperReward(
        uint256 listingId,
        address warper,
        uint256 percentage
    ) external;

    /**
     * @dev Defines lister reward percentage for specific universe.
     * @param listingId The listing ID.
     * @param universeId The universe ID.
     * @param percentage Reward base percentage (lister reward for certain universe).
     */
    function setListerUniverseReward(
        uint256 listingId,
        uint256 universeId,
        uint256 percentage
    ) external;

    /**
     * @dev Defines universe reward percentage.
     * @param universeId The universe ID.
     * @param percentage Reward base percentage (default universe reward).
     */
    function setUniverseReward(uint256 universeId, uint256 percentage) external;

    /**
     * @dev Defines universe reward percentage for specific warper.
     * @param universeId The universe ID.
     * @param warper Warper address.
     * @param percentage Reward base percentage (universe reward for certain warper).
     */
    function setUniverseWarperReward(
        uint256 universeId,
        address warper,
        uint256 percentage
    ) external;

    /**
     * @dev Defines protocol reward percentage for specific warper.
     * @param warper Warper address.
     * @param percentage Reward base percentage (protocol reward for certain warper).
     */
    function setProtocolWarperReward(address warper, uint256 percentage) external;

    /**
     * @dev Returns the reward percentages allocation for lister, universe, protocol.
     * @param listingId The listing ID.
     * @return listerPercentage Lister reward percentage.
     * @return universePercentage Universe reward percentage.
     * @return protocolPercentage Protocol reward percentage.
     */
    function getRewardAllocations(uint256 listingId)
        external
        view
        returns (
            uint256 listerPercentage,
            uint256 universePercentage,
            uint256 protocolPercentage
        );

    /**
     * @inheritdoc IListingController
     */
    function calculateRentalFee(Listings.Params calldata strategyParams, Rentings.Params calldata rentingParams)
        external
        pure
        returns (uint256);

    /**
     * @inheritdoc IListingController
     */
    function strategyId() external pure returns (bytes4);

    /**
     * @dev Decodes listing strategy params.
     * @param params Encoded listing strategy params.
     * @return baseRate Asset renting base rate (base tokens per second).
     * @return basePercentage Reward base percentage (default lister reward).
     */
    function _decodeStrategyParams(Listings.Params memory params)
        external
        pure
        returns (uint256 baseRate, uint256 basePercentage);

    /**
     * @dev Reverts if strategy is not compatible.
     * @param checkedStrategyId Strategy ID.
     */
    function _checkStrategy(bytes4 checkedStrategyId) external pure;
}
