// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../universe/IUniverseToken.sol";

contract InterfacePrinter {
    function universeToken() external pure returns (bytes4) {
        return bytes4(type(IUniverseToken).interfaceId);
    }

    function erc721() external pure returns (bytes4) {
        return bytes4(type(IERC721).interfaceId);
    }
}
