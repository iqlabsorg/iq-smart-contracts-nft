// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../Errors.sol";
import "./IUniverseToken.sol";
import "../acl/AccessControlled.sol";
import "../acl/IACL.sol";

contract UniverseToken is IUniverseToken, UUPSUpgradeable, ERC721Upgradeable, AccessControlled {
    using Counters for Counters.Counter;

    // ID counter.
    Counters.Counter private _tokenIdTracker;

    // Metahub address.
    address private _metahub;
    address private _aclContract;

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

    /**
     * @dev UniverseToken initializer.
     * @param metahub Warper preset factory address.
     */
    function initialize(address metahub, address acl) external initializer {
        __UUPSUpgradeable_init();
        __ERC721_init("IQVerse", "IQV");

        _metahub = metahub;
        _aclContract = acl;
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
    function supportsInterface(bytes4 interfaceId) public view override(ERC721Upgradeable, IERC165) returns (bool) {
        return interfaceId == type(IUniverseToken).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc AccessControlled
     */
    function _acl() internal virtual override returns (IACL) {
        return IACL(_aclContract);
    }

    function _authorizeUpgrade(address newImplementation) internal virtual override onlyAdmin {}
}
