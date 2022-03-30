// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../Errors.sol";
import "./IUniverseToken.sol";
import "../acl/AccessControlledUpgradeable.sol";
import "../acl/IACL.sol";

contract UniverseToken is IUniverseToken, UUPSUpgradeable, ERC721Upgradeable, AccessControlledUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;

    // ID counter.
    CountersUpgradeable.Counter private _tokenIdTracker;

    // Metahub address.
    address private _metahub;
    IACL private _aclContract;

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
     * @dev Constructor that gets called for the implementation contract.
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {}

    /**
     * @dev UniverseToken initializer.
     * @param metahub Warper preset factory address.
     */
    function initialize(address metahub, address acl) external initializer {
        __UUPSUpgradeable_init();
        __ERC721_init("IQVerse", "IQV");

        _metahub = metahub;
        _aclContract = IACL(acl);
    }

    /**
     * @inheritdoc IUniverseToken
     */
    function mint(address to, string calldata name) external onlyMetahub returns (uint256 tokenId) {
        _tokenIdTracker.increment();
        tokenId = _tokenIdTracker.current();
        _safeMint(to, tokenId);
        _universeNames[tokenId] = name;

        // todo Emit event
    }

    /**
     * @inheritdoc IUniverseToken
     */
    function setUniverseName(uint256 tokenId, string memory name) external onlyMetahub {
        _universeNames[tokenId] = name;

        // todo Emit event
    }

    /**
     * @inheritdoc IUniverseToken
     */
    function universeName(uint256 tokenId) external view returns (string memory) {
        return _universeNames[tokenId];
    }

    /**
     * @inheritdoc IERC165Upgradeable
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return interfaceId == type(IUniverseToken).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }

    /**
     * @inheritdoc UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}
}
