// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../warper/ERC721/ERC721Warper.sol";

contract ERC721WarperMock is ERC721Warper {
    function __initialize(bytes calldata config) external virtual initializer {
        // Decode config
        (address original, address metahub) = abi.decode(config, (address, address));
        _Warper_init(original, metahub);
    }

    // NOTE: Exposing directly for tests
    function mint(address to, uint256 tokenId) external virtual {
        mint(to, tokenId, "");
    }
}
