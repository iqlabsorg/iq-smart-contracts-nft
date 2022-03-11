// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IERC721RentalFeePremiumMechanics {
    /**
     * @dev Calculate extra premiums.
     * @param tokenId The token id to calculate the extra premium for.
     * @param renter The renter address.
     * @param period The duration period in seconds for the rent.
     * @param universeFee The current universe fee.
     * @param listerFee The current lister fee.
     * @return universePremium The universe premium price to add.
     * @return listerPremium The lister premium price to add.
     */
    function calculatePremiums(
        uint256 tokenId,
        address renter,
        uint32 period,
        uint256 universeFee,
        uint256 listerFee
    ) external view returns (uint256 universePremium, uint256 listerPremium);
}
