// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../Errors.sol";
import "./IUniverseToken.sol";

contract UniverseToken is IUniverseToken, ERC721, Ownable {
    using Counters for Counters.Counter;

    // ID counter.
    Counters.Counter private _tokenIdTracker;

    // Metahub address.
    address private immutable _metahub;

    // Mapping from token ID to universe name.
    mapping(uint256 => string) private _universeNames;

    /**
     * @dev Modifier to make a function callable only by the metahub contract.
     */
    modifier onlyMetahub() {
        if (_msgSender() != _metahub) {
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
    function mint(address to, string calldata universeName) external onlyMetahub returns (uint256 tokenId) {
        _tokenIdTracker.increment();
        tokenId = _tokenIdTracker.current();
        _safeMint(to, tokenId);
        _universeNames[tokenId] = universeName;
    }

    /**
     * @inheritdoc IUniverseToken
     */
    function universeName(uint256 tokenId) external view returns (string memory) {
        return _universeNames[tokenId];
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, IERC165) returns (bool) {
        return interfaceId == type(IUniverseToken).interfaceId || super.supportsInterface(interfaceId);
    }
}
