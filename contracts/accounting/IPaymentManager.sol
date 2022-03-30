// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./Accounts.sol";

interface IPaymentManager {
    /**
     * @dev Transfers the specific `amount` of `token` from a protocol balance to an arbitrary address.
     * @param token The token address.
     * @param amount The amount to be withdrawn.
     * @param to The transfer recipient address.
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
     * @param to The transfer recipient address.
     */
    function withdrawUniverseFunds(
        uint256 universeId,
        address token,
        uint256 amount,
        address to
    ) external;

    /**
     * @dev Get the base token that's used for stable price denomination.
     * @return The base token address.
     */
    function baseToken() external view returns (address);

    /**
     * @dev Returns the amount to `token`, currently accumulated by the protocol.
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
     * @dev Returns the amount to `token`, currently accumulated by the universe.
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
}
