// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IRentalFeePremiumMechanics {
    /**
     * @dev Calculate extra premiums.
     * @param renter The renter address.
     * @param tokenId The token ID to calculate the extra premium for.
     * @param amount The token amount.
     * @param rentalPeriod The rental period in seconds.
     * @param universeFee The current universe fee.
     * @param listerFee The current lister fee.
     * @return universePremium The universe premium price to add.
     * @return listerPremium The lister premium price to add.
     */
    function calculatePremiums(
        address renter,
        uint256 tokenId,
        uint256 amount,
        uint32 rentalPeriod,
        uint256 universeFee,
        uint256 listerFee
    ) external view returns (uint256 universePremium, uint256 listerPremium);
}
