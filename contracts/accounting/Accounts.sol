// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./EnumerableMapUpgradeable.sol";

library Accounts {
    using Accounts for Account;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;

    /**
     * @dev Thrown when the amount requested to be paid out is not valid.
     */
    error InvalidWithdrawalAmount(uint256 amount);

    /**
     * @dev Thrown when the amount requested to be paid out is larger than available balance.
     */
    error InsufficientBalance(uint256 balance);

    /**
     * @dev A structure that describes account balance in ERC20 tokens.
     */
    struct Balance {
        address token;
        uint256 amount;
    }

    /**
     * @dev Describes an account state.
     * @param tokenBalances Mapping from an ERC20 token address to the amount.
     */
    struct Account {
        EnumerableMapUpgradeable.AddressToUintMap tokenBalances;
    }

    /**
     * @dev Transfers funds from the account balance to the specific address after validating balance sufficiency.
     */
    function withdraw(
        Account storage self,
        address token,
        uint256 amount,
        address to
    ) internal {
        if (amount == 0) revert InvalidWithdrawalAmount(amount);
        uint256 currentBalance = self.balance(token);
        if (amount > currentBalance) revert InsufficientBalance(currentBalance);
        unchecked {
            self.tokenBalances.set(token, currentBalance - amount);
        }
        IERC20Upgradeable(token).safeTransfer(to, amount);
    }

    /**
     * @dev Increments value of the particular account balance.
     */
    function increaseBalance(
        Account storage self,
        address token,
        uint256 amount
    ) internal {
        uint256 currentBalance = self.balance(token);
        self.tokenBalances.set(token, currentBalance + amount);
    }

    /**
     * @dev Returns account current balance.
     * Does not revert if `token` is not in the map.
     */
    function balance(Account storage self, address token) internal view returns (uint256) {
        (, uint256 value) = self.tokenBalances.tryGet(token);
        return value;
    }

    /**
     * @dev Returns the list of account balances in various tokens.
     */
    function balances(Account storage self) internal view returns (Balance[] memory) {
        uint256 length = self.tokenBalances.length();
        Balance[] memory allBalances = new Balance[](length);
        for (uint256 i = 0; i < length; i++) {
            (address token, uint256 amount) = self.tokenBalances.at(i);
            allBalances[i] = Balance({token: token, amount: amount});
        }
        return allBalances;
    }

    /**
     * @dev Account registry.
     * @param protocol The protocol account.
     * @param universes Mapping from a universe ID to the universe account.
     */
    struct Registry {
        Account protocol;
        mapping(uint256 => Account) universes;
    }
}
