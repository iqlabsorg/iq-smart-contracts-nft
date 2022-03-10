// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../../asset/Assets.sol";
import "../../renting/Renting.sol";

interface IRentalFeePremiumMechanics {
    /**
     * @dev Calculate extra premiums.
     * @return universePremium The universe premium price to add.
     * @return listerPremium The lister premium price to add.
     */
    function calculatePremiums(
        Assets.Asset calldata asset,
        Renting.Params calldata rentingParams,
        uint256 universeFee,
        uint256 listerFee
    ) external view returns (uint256 universePremium, uint256 listerPremium);
}
