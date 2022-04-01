// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./IUniverseToken.sol";

/**
 * @title Universe token contract.
 */
contract UniverseToken is IUniverseToken, ERC721 {
    using Counters for Counters.Counter;

    /**
     * @dev Thrown when the message sender doesn't match the registries address.
     */
    error CallerIsNotRegistry();

    /**
     * @dev Registry address.
     */
    address private immutable _registry;

    /**
     * @dev Token ID counter.
     */
    Counters.Counter private _tokenIdTracker;

    /**
     * @dev Modifier to make a function callable only by the registry contract.
     */
    modifier onlyRegistry() {
        if (_msgSender() != _registry) revert CallerIsNotRegistry();
        _;
    }

    /**
     * @dev UniverseToken constructor.
     * @param registry Universe registry.
     */
    constructor(address registry) ERC721("IQVerse", "IQV") {
        _registry = registry;
    }

    /**
     * @inheritdoc IUniverseToken
     */
    function mint(address to) external onlyRegistry returns (uint256 tokenId) {
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
