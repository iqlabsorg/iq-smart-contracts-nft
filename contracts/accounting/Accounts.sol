// solhint-disable private-vars-leading-underscore
// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableMapUpgradeable.sol";
import "../renting/Rentings.sol";
import "../universe/IUniverseRegistry.sol";
import "../listing/Listings.sol";
import "./IPaymentManager.sol";

library Accounts {
    using Accounts for Account;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableMapUpgradeable for EnumerableMapUpgradeable.AddressToUintMap;

    /**
     * @dev Thrown when the estimated rental fee calculated upon renting
     * is higher than maximal payment amount the renter is willing to pay.
     */
    error RentalFeeSlippage();

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
    ) external {
        if (amount == 0) revert InvalidWithdrawalAmount(amount);
        uint256 currentBalance = self.balance(token);
        if (amount > currentBalance) revert InsufficientBalance(currentBalance);
        unchecked {
            self.tokenBalances.set(token, currentBalance - amount);
        }
        IERC20Upgradeable(token).safeTransfer(to, amount);
    }

    struct UserEarning {
        IPaymentManager.EarningType earningType;
        address account;
        uint256 value;
        address token;
    }

    struct RentalEarnings {
        UserEarning[] userEarnings;
        // Universe
        uint256 universeId;
        uint256 universeEarningValue;
        address universeEarningToken;
        // Protocol
        uint256 protocolEarningValue;
        address protocolEarningToken;
    }

    function handleRentalPayment(
        Accounts.Registry storage self,
        Rentings.Params calldata rentingParams,
        Rentings.RentalFees calldata fees,
        address payer,
        uint256 maxPaymentAmount,
        Warpers.Registry storage warperRegistry,
        Listings.Registry storage listingRegistry
    ) external returns (RentalEarnings memory earnings) {
        // Ensure no rental fee payment slippage.
        if (fees.total > maxPaymentAmount) revert RentalFeeSlippage();

        // The amount of payment tokens to be accumulated on the Metahub for future payouts.
        // This will include all fees which are not being paid out immediately.
        uint256 accumulatedTokens = 0;

        // Currently we only support earnings for 1 user
        earnings.userEarnings = new UserEarning[](1);

        // Handle lister fee component.
        Listings.Listing storage listing = listingRegistry.listings[rentingParams.listingId];
        UserEarning memory listerEarning = UserEarning({
            earningType: IPaymentManager.EarningType.LISTER_FEE,
            account: listing.lister,
            value: fees.listerBaseFee + fees.listerPremium,
            token: rentingParams.paymentToken
        });
        earnings.userEarnings[0] = listerEarning;

        // If lister requested immediate payouts, transfer the lister fee part directly to the lister account.
        // Otherwise increase the lister balance.
        if (listing.immediatePayout) {
            IERC20Upgradeable(listerEarning.token).safeTransferFrom(payer, listerEarning.account, listerEarning.value);
        } else {
            self.users[listerEarning.account].increaseBalance(listerEarning.token, listerEarning.value);
            accumulatedTokens += listerEarning.value;
        }

        // Handle universe fee component.
        earnings.universeId = warperRegistry.warpers[rentingParams.warper].universeId;
        earnings.universeEarningValue = fees.universeBaseFee + fees.universePremium;
        earnings.universeEarningToken = rentingParams.paymentToken;
        // Increase universe balance.
        self.universes[earnings.universeId].increaseBalance(
            earnings.universeEarningToken,
            earnings.universeEarningValue
        );
        accumulatedTokens += earnings.universeEarningValue;

        // Handle protocol fee component.
        earnings.protocolEarningValue = fees.protocolFee;
        earnings.protocolEarningToken = rentingParams.paymentToken;
        self.protocol.increaseBalance(earnings.protocolEarningToken, earnings.protocolEarningValue);
        accumulatedTokens += earnings.protocolEarningValue;

        // Transfer the accumulated token amount from payer to the metahub.
        IERC20Upgradeable(rentingParams.paymentToken).safeTransferFrom(payer, address(this), accumulatedTokens);
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
     * @param protocol The protocol account state.
     * @param universes Mapping from a universe ID to the universe account state.
     * @param users Mapping from a user address to the account state.
     */
    struct Registry {
        Account protocol;
        mapping(uint256 => Account) universes;
        mapping(address => Account) users;
    }
}
