// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./Wrapping.sol";
import "./interfaces/IERC721Wrapping.sol";

contract ERC721Wrapping is IERC721Wrapping, Wrapping {
    /* solhint-disable no-empty-blocks */
    constructor(address origin) Wrapping(origin) {
        // todo: check code at address
        // todo: ensure origin is ERC721
    }

    // todo: remove!
    function getOrigin() external view override returns (address) {
        return _getOrigin();
    }
}
