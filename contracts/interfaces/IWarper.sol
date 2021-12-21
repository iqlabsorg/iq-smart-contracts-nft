// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/interfaces/IERC165.sol";

interface IWarper is IERC165 {
    /**
     * @dev Returns the original NFT address.
     */
    function __original() external view returns (address);

    // todo: add lifecycle hooks
    // __onWarp()
}
