// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Protocol.sol";
import "../warper/IWarperManager.sol";

interface IProtocolConfigManager {
    /**
     * @dev Raised when the caller is not the WarperManager contract.
     */
    error CallerIsNotWarperManager();

    /**
     * @dev Emitted when a protocol rental fee is changed.
     * @param rentalFeePercent New protocol rental fee percentage.
     */
    event ProtocolRentalFeeChanged(uint16 rentalFeePercent);

    /**
     * @dev Updates the protocol rental fee percentage.
     * @param rentalFeePercent New protocol rental fee percentage.
     */
    function setProtocolRentalFeePercent(uint16 rentalFeePercent) external;

    /**
     * @dev Returns the protocol rental fee percentage.
     * @return protocol fee percent.
     */
    function protocolRentalFeePercent() external view returns (uint16);

    /**
     * @dev Returns the base token that's used for stable price denomination.
     * @return The base token address.
     */
    function baseToken() external view returns (address);

    /**
     * @dev Get thee Warper Controller contracts address for a given warper.
     * @param warper the warper address.
     * @return The Warper Controller address.
     */
    function warperController(address warper) external view returns (address);
}
