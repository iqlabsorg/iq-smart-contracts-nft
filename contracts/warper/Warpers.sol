// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IWarperController.sol";

library Warpers {
    /**
     * @dev Thrown when the operation is not allowed due to the warper being paused.
     */
    error WarperIsPaused();

    /**
     * @dev Thrown when the operation is not allowed due to the warper not being paused.
     */
    error WarperIsNotPaused();

    /**
     * @dev Registered warper data.
     * @param universeId Warper universe ID.
     * @param controller Warper asset controller.
     * @param paused Indicates whether the warper is paused.
     */
    struct Info {
        uint256 universeId;
        IWarperController controller;
        bool paused;
    }

    // TODO: docs
    function pauseWarper(Info storage self) internal {
        if (self.paused) revert WarperIsPaused();

        self.paused = true;
    }

    // TODO: docs
    function unpauseWarper(Info storage self) internal {
        if (!self.paused) revert WarperIsNotPaused();

        self.paused = false;
    }
}
