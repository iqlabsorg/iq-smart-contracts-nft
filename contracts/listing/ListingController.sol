// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./IListingController.sol";

abstract contract ListingController is IListingController, ERC165 {
    /**
     * @dev Thrown when the listing cannot be processed by the specific controller due to the listing strategy ID mismatch.
     * @param actual Actual listing strategy ID.
     * @param required Required listing strategy ID.
     */
    error ListingStrategyMismatch(bytes4 actual, bytes4 required);

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(IERC165, ERC165) returns (bool) {
        return interfaceId == type(IListingController).interfaceId || super.supportsInterface(interfaceId);
    }
}
