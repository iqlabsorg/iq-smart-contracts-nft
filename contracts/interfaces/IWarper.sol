// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/interfaces/IERC165.sol";

interface IWarper is IERC165 {
    /**
     * @dev Returns the original asset address.
     */
    function iqOriginal() external view returns (address);

    /**
     * @dev Returns the MetaHub address.
     */
    function iqMetaHub() external view returns (address);

    /**
     * @dev Default warper initialization method.
     * @param config Warper configuration parameters.
     */
    function iqInitialize(bytes calldata config) external;

    // todo: add lifecycle hooks
}
