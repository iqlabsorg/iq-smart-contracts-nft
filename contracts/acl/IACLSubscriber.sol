// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/IAccessControlEnumerable.sol";

import "./ACL.sol";

/**
 * @title Access Control List Subscriber contract interface.
 */
interface IACLSubscriber {
    /**
     * @dev return the ACL address
     */
    function getAcl() external view returns (ACL);
}
