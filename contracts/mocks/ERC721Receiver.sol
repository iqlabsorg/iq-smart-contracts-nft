// SPDX-License-Identifier: MIT
// solhint-disable-next-line
// Source: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/b0cf6fbb7a70f31527f36579ad644e1cf12fdf4e/contracts/mocks/ERC721ReceiverMock.sol

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";

contract ERC721ReceiverMock is IERC721Receiver {
    enum Error {
        NONE,
        REVERT_WITH_MESSAGE,
        REVERT_WITHOUT_MESSAGE,
        PANIC
    }

    bytes4 private immutable _retval;
    Error private immutable _error;

    event Received(address operator, address from, uint256 tokenId, bytes data);

    constructor(bytes4 retval, Error error) {
        _retval = retval;
        _error = error;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes memory data
    ) public override returns (bytes4) {
        if (_error == Error.REVERT_WITH_MESSAGE) {
            revert("ERC721ReceiverMock: reverting");
        } else if (_error == Error.REVERT_WITHOUT_MESSAGE) {
            revert();
        } else if (_error == Error.PANIC) {
            uint256 a = uint256(0) / uint256(0);
            a;
        }
        emit Received(operator, from, tokenId, data); // NOTE: The original version has `gasLeft()` call here as well
        return _retval;
    }
}
