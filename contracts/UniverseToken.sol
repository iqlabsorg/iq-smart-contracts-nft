// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IUniverseToken.sol";

// TODO: the token URI does not represent anything.
contract UniverseToken is IUniverseToken, ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdTracker;

    error CallerIsNotMetahub();

    address internal _metahub;

    modifier onlyMetahub() {
        if (msg.sender != _metahub) {
            revert CallerIsNotMetahub();
        }
        _;
    }

    constructor(address metahub) ERC721("IQVerse", "IQV") Ownable() {
        _metahub = metahub;
    }

    /**
     * @inheritdoc IUniverseToken
     */
    function mint(address to) external onlyMetahub returns (uint256 tokenId) {
        _tokenIdTracker.increment();
        tokenId = _tokenIdTracker.current();
        _safeMint(to, tokenId);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, IERC165) returns (bool) {
        return interfaceId == type(IUniverseToken).interfaceId || super.supportsInterface(interfaceId);
    }
}
