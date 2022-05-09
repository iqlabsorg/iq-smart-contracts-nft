// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./Accounts.sol";

interface IPaymentManager {
    /**
     * @notice Describes the earning type.
     */
    enum EarningType {
        LISTER_FEE
    }

    /**
     * @dev Emitted when a user has earned some amount tokens.
     * @param user Address of the user that earned some amount.
     * @param earningType Describes the type of the user.
     * @param paymentToken The currency that the user has earned.
     * @param amount The amount of tokens that the user has earned.
     */
    event UserEarned(
        address indexed user,
        EarningType indexed earningType,
        address indexed paymentToken,
        uint256 amount
    );

    /**
     * @dev Emitted when the universe has earned some amount of tokens.
     * @param universeId ID of the universe that earned the tokens.
     * @param paymentToken The currency that the user has earned.
     * @param amount The amount of tokens that the user has earned.
     */
    event UniverseEarned(uint256 indexed universeId, address indexed paymentToken, uint256 amount);

    /**
     * @dev Emitted when the protocol has earned some amount of tokens.
     * @param paymentToken The currency that the user has earned.
     * @param amount The amount of tokens that the user has earned.
     */
    event ProtocolEarned(address indexed paymentToken, uint256 amount);

    /**
     * @dev Transfers the specific `amount` of `token` from a protocol balance to an arbitrary address.
     * @param token The token address.
     * @param amount The amount to be withdrawn.
     * @param to The payee address.
     */
    function withdrawProtocolFunds(
        address token,
        uint256 amount,
        address to
    ) external;

    /**
     * @dev Transfers the specific `amount` of `token` from a universe balance to an arbitrary address.
     * @param universeId The universe ID.
     * @param token The token address.
     * @param amount The amount to be withdrawn.
     * @param to The payee address.
     */
    function withdrawUniverseFunds(
        uint256 universeId,
        address token,
        uint256 amount,
        address to
    ) external;

    /**
     * @dev Transfers the specific `amount` of `token` from a user balance to an arbitrary address.
     * @param token The token address.
     * @param amount The amount to be withdrawn.
     * @param to The payee address.
     */
    function withdrawFunds(
        address token,
        uint256 amount,
        address to
    ) external;

    /**
     * @dev Returns the amount of `token`, currently accumulated by the protocol.
     * @param token The token address.
     * @return Balance of `token`.
     */
    function protocolBalance(address token) external view returns (uint256);

    /**
     * @dev Returns the list of protocol balances in various tokens.
     * @return List of balances.
     */
    function protocolBalances() external view returns (Accounts.Balance[] memory);

    /**
     * @dev Returns the amount of `token`, currently accumulated by the universe.
     * @param universeId The universe ID.
     * @param token The token address.
     * @return Balance of `token`.
     */
    function universeBalance(uint256 universeId, address token) external view returns (uint256);

    /**
     * @dev Returns the list of universe balances in various tokens.
     * @param universeId The universe ID.
     * @return List of balances.
     */
    function universeBalances(uint256 universeId) external view returns (Accounts.Balance[] memory);

    /**
     * @dev Returns the amount of `token`, currently accumulated by the user.
     * @param account The account to query the balance for.
     * @param token The token address.
     * @return Balance of `token`.
     */
    function balance(address account, address token) external view returns (uint256);

    /**
     * @dev Returns the list of user balances in various tokens.
     * @param account The account to query the balance for.
     * @return List of balances.
     */
    function balances(address account) external view returns (Accounts.Balance[] memory);
}
