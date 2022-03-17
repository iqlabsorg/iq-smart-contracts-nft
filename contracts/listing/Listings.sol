// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "../asset/Assets.sol";

library Listings {
    /*
     * @dev Listing strategy identifiers to be used across the system:
     */
    bytes4 public constant FIXED_PRICE = bytes4(keccak256("FIXED_PRICE"));

    /**
     * @dev Listing params.
     * The layout of `data` might vary for different listing strategies.
     * For example, in case of FIXED_PRICE strategy, the `data` might contain only base rate,
     * and for more advanced auction strategies it might include period, min bid step etc.
     * @param strategy Listing strategy ID
     * @param data Listing strategy data.
     */
    struct Params {
        bytes4 strategy;
        bytes data;
    }

    /**
     * @dev Listing details structure.
     * @param lister Lister account address.
     * @param asset Listed asset structure.
     * @param params Listing strategy parameters.
     * @param maxLockPeriod The maximum amount of time the asset owner can wait before getting the asset back.
     * @param lockedTill The earliest possible time when the asset can be returned to the owner.
     * @param delisted Indicates whether the asset is delisted.
     * @param paused Indicates whether the listing is paused.
     */
    struct Info {
        address lister;
        Assets.Asset asset;
        Params params;
        uint32 maxLockPeriod;
        uint32 lockedTill;
        bool delisted;
        bool paused;
    }
}
