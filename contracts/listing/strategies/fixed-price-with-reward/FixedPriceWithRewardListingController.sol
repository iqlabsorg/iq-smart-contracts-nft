// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../../../acl/AccessControlledUpgradeable.sol";
import "../../ListingController.sol";

import "./IFixedPriceWithRewardListingController.sol";
import "./FixedPriceWithRewardListingControllerStorage.sol";

contract FixedPriceWithRewardListingController is
    IFixedPriceWithRewardListingController,
    UUPSUpgradeable,
    AccessControlledUpgradeable,
    ListingController,
    FixedPriceWithRewardListingControllerStorage
{
    /**
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Contract initializer.
     * @param acl ACL contract address.
     */
    function initialize(address acl) external initializer {
        __UUPSUpgradeable_init();
        _aclContract = IACL(acl);
    }

    /**
     * @inheritdoc IListingController
     */
    function calculateRentalFee(Listings.Params calldata strategyParams, Rentings.Params calldata rentingParams)
        external
        pure
        returns (uint256)
    {
        (uint256 baseRate, ) = decodeStrategyParams(strategyParams);
        return rentingParams.rentalPeriod * baseRate;
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view override(ListingController, IERC165) returns (bool) {
        return
            interfaceId == type(IFixedPriceWithRewardListingController).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IListingController
     */
    function strategyId() public pure override(ListingController, IListingController) returns (bytes4) {
        return Listings.FIXED_PRICE_WITH_REWARD;
    }

    /**
     * @inheritdoc IFixedPriceWithRewardListingController
     */
    function decodeStrategyParams(Listings.Params memory params)
        public
        pure
        compatibleStrategy(params.strategy)
        returns (uint256 baseRate, uint16 baseRewardPercent)
    {
        return abi.decode(params.data, (uint256, uint16));
    }

    /**
     * @inheritdoc UUPSUpgradeable
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @inheritdoc AccessControlledUpgradeable
     */
    function _acl() internal view override returns (IACL) {
        return _aclContract;
    }
}
