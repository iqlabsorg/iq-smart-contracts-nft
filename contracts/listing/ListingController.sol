// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./IListingController.sol";

abstract contract ListingController is IListingController, ERC165 {
    /**
     * @dev Modifier to check strategy compatibility.
     */
    modifier compatibleStrategy(bytes4 checkedStrategyId) {
        if (checkedStrategyId != strategyId()) revert ListingStrategyMismatch(checkedStrategyId, strategyId());
        _;
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, ERC165) returns (bool) {
        return interfaceId == type(IListingController).interfaceId || super.supportsInterface(interfaceId);
    }

    /**
     * @inheritdoc IListingController
     */
    function strategyId() public pure virtual returns (bytes4);
}
