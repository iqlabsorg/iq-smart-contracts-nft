// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "./params/IRentalParamStore.sol";

interface IWarper is IERC165, IRentalParamStore {
    /**
     * @dev Default warper initialization method.
     * @param config Warper configuration parameters.
     */
    function __initialize(bytes calldata config) external;

    /**
     * @dev Returns the original asset address.
     */
    function __original() external view returns (address);

    /**
     * @dev Returns the Metahub address.
     */
    function __metahub() external view returns (address);

    // todo: add lifecycle hooks
}
