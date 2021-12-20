// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "./IWrapping.sol";

interface IERC721Wrapping is IWrapping, IERC721 {
    //todo: events
}
