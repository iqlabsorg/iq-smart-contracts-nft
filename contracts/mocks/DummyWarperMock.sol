// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../warper/Warper.sol";

contract DummyWarperMock is Warper {
    uint256 _initValue;

    function customInitialize(bytes calldata config) external {
        uint256 initValue = abi.decode(config, (uint256));
        _initValue = initValue;
    }

    function getInitValue() external view returns (uint256) {
        return _initValue;
    }
}
