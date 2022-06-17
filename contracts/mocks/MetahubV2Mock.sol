// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../metahub/Metahub.sol";

contract MetahubV2Mock is Metahub {
    function version() external pure returns (string memory) {
        return "V2";
    }
}
