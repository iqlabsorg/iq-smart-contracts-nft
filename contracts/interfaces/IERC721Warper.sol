// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "./IWarper.sol";

interface IERC721Warper is IWarper, IERC721 {
    //todo: events
}
