// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC165.sol";

interface IWarper is IERC165 {
    /**
     * @dev Returns the original asset address.
     */
    function __original() external view returns (address);

    /**
     * @dev Returns the Metahub address.
     */
    function __metahub() external view returns (address);

    /**
     * @dev Returns the warper asset class ID.
     */
    function __assetClass() external view returns (bytes4);
}
