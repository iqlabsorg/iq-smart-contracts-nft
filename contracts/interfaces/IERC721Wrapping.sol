// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

interface IERC721Wrapping {
    function getOrigin() external view returns (address);
}
