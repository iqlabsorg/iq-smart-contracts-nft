// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @notice An NFT contract used for internal testing purposes.
 */
contract ERC721InternalTest is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;
    // Optional mapping for token URIs
    mapping(uint256 => string) private _tokenURIs;

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        // solhint-disable-previous-line no-empty-blocks
    }

    function mint(string memory newTokenURI) public {
        _mint(msg.sender, _tokenIdTracker.current());
        _tokenURIs[_tokenIdTracker.current()] = newTokenURI;
        _tokenIdTracker.increment();
    }

    function setTokenURI(uint256 tokenId, string memory newTokenURI) public {
        _tokenURIs[tokenId] = newTokenURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return _tokenURIs[tokenId];
    }
}
