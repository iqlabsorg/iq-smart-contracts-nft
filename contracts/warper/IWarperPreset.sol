// SPDX-License-Identifier: MIT
// solhint-disable private-vars-leading-underscore
pragma solidity ^0.8.13;

import "./IWarper.sol";

interface IWarperPreset is IWarper {
    /**
     * @dev Warper generic initialization method.
     * @param config Warper configuration parameters.
     */
    function __initialize(bytes calldata config) external;
}
