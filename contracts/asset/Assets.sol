// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

library Assets {
    /*
     * @dev This is the list of asset class identifiers to be used across the system.
     */
    bytes4 public constant ERC20 = bytes4(keccak256("ERC20"));
    bytes4 public constant ERC721 = bytes4(keccak256("ERC721"));
    bytes4 public constant ERC1155 = bytes4(keccak256("ERC1155"));

    /**
     * @dev Communicates asset identification information.
     * The structure designed to be token-standard agnostic, so the layout of `data` might vary for different token standards.
     * For example, in case of ERC20 token, the `data` will contain contract address only,
     * and for ERC721 it will include both contract address and tokenId.
     * @param class Asset class ID
     * @param data Asset identification data.
     */
    struct AssetId {
        bytes4 class;
        bytes data;
    }

    /**
     * @dev Uniformed structure to describe arbitrary asset (token) and its value.
     * @param id Asset ID structure.
     * @param value Asset value (amount).
     */
    struct Asset {
        AssetId id;
        uint256 value;
    }

    /**
     * @dev Makes new Asset structure.
     * @param class Asset class ID
     * @param data Asset identification data.
     * @param value Asset value (amount).
     */
    function make(
        bytes4 class,
        bytes memory data,
        uint256 value
    ) internal pure returns (Asset memory asset) {
        return Asset(AssetId(class, data), value);
    }
}
