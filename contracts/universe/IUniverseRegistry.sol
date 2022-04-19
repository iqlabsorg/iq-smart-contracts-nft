// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IUniverseRegistry {
    /**
     * @dev Thrown when a check is made where the given account must also be the universe owner.
     */
    error AccountIsNotUniverseOwner(address account);

    /**
     * @dev Thrown when a the supplied universe name is empty.
     */
    error EmptyUniverseName();

    /**
     * @dev Thrown when trying to read universe data for a universe is not registered.
     */
    error QueryForNonexistentUniverse(uint256 universeId);

    /**
     * @dev Emitted when a universe is created.
     * @param universeId Universe ID.
     * @param name Universe name.
     */
    event UniverseChanged(uint256 indexed universeId, string name);

    /**
     * @dev Emitted when a universe name is changed.
     * @param universeId Universe ID.
     * @param name The newly set name.
     */
    event UniverseNameChanged(uint256 indexed universeId, string name);

    /**
     * @dev Emitted when universe rental fee is changed.
     * @param universeId Universe ID.
     * @param rentalFeePercent The newly rental fee.
     */
    event UniverseRentalFeeChanged(uint256 indexed universeId, uint16 rentalFeePercent);

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
     * @dev Creates new Universe. This includes minting new universe NFT,
     * where the caller of this method becomes the universe owner.
     * @param params The universe properties & initial configuration params.
     * @return Universe ID (universe token ID).
     */
    function createUniverse(UniverseParams calldata params) external returns (uint256);

    /**
     * @dev Update the universe name.
     * @param universeId The unique identifier for the universe.
     * @param universeName The universe name to set.
     */
    function setUniverseName(uint256 universeId, string memory universeName) external;

    /**
     * @dev Update the universe rental fee percent.
     * @param universeId The unique identifier for the universe.
     * @param rentalFeePercent The universe rental fee percent.
     */
    function setUniverseRentalFee(uint256 universeId, uint16 rentalFeePercent) external;

    /**
     * @dev Returns Universe owner address.
     * @param universeId Universe ID.
     * @return Universe owner.
     */
    function universeOwner(uint256 universeId) external view returns (address);

    /**
     * @dev Returns Universe fee percent.
     * @param universeId Universe ID.
     * @return universe fee percent.
     */
    function universeFeePercent(uint256 universeId) external view returns (uint16);

    /**
     * @dev Returns name.
     * @param universeId Universe ID.
     * @return universe name.
     */
    function universeName(uint256 universeId) external view returns (string memory);

    /**
     * @dev Returns the Universe token address.
     */
    function universeToken() external view returns (address);

    /**
     * @dev Aggregate and return Universe data.
     * @param universeId Universe-specific ID.
     * @return name The name of the Universe contract.
     * @return symbol The symbol of the Universe contract.
     * @return universeName The name of the universe.
     */
    function universe(uint256 universeId)
        external
        view
        returns (
            string memory name,
            string memory symbol,
            string memory universeName,
            uint16 rentalFeePercent
        );

    /**
     * @dev Reverts if the universe owner is not the provided account address.
     * @param universeId Universe ID.
     * @param account The address of the expected owner.
     */
    function checkUniverseOwner(uint256 universeId, address account) external view;

    /**
     * @dev Returns `true` if the universe owner is the supplied account address.
     * @param universeId Universe ID.
     * @param account The address of the expected owner.
     */
    function isUniverseOwner(uint256 universeId, address account) external view returns (bool);
}
