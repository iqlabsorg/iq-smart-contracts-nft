// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IUniverseManager {
    /**
     * @dev The universe properties & initial configuration params.
     * @param name The universe name.
     * @param rentalFeePercent The base percentage of the rental fee which the universe charges for using its warpers.
     */
    struct UniverseParams {
        string name;
        uint16 rentalFeePercent;
    }

    /**
     * @dev Emitted when a universe is created.
     * @param universeId Universe ID.
     * @param name Universe name.
     */
    event UniverseCreated(uint256 indexed universeId, string name);

    /**
     * @dev Creates new Universe. This includes minting new universe NFT, where the caller of this method becomes the universe owner.
     * @param params The universe properties & initial configuration params.
     * @return Universe ID (universe token ID).
     */
    function createUniverse(UniverseParams calldata params) external returns (uint256);

    /**
     * @dev Aggregate and return Universe data.
     * @param universeId Universe-specific ID.
     * @return name The name of the Universe contract.
     * @return symbol The symbol of the Universe contract.
     * @return universeName The name of the universe.
     */
    function universe(uint256 universeId)
        external
        returns (
            string memory name,
            string memory symbol,
            string memory universeName
        );
}
