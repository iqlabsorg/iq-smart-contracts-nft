
## ERC165CheckerUpgradeable

_Library used to query support of an interface declared via {IERC165}.

Note that these functions return the actual result of the query: they do not
&#x60;revert&#x60; if an interface is not supported. It is up to the caller to decide
what to do in these cases._

### _INTERFACE_ID_INVALID

```solidity
bytes4 _INTERFACE_ID_INVALID
```

### supportsERC165

```solidity
function supportsERC165(address account) internal view returns (bool)
```

_Returns true if &#x60;account&#x60; supports the {IERC165} interface,_

### supportsInterface

```solidity
function supportsInterface(address account, bytes4 interfaceId) internal view returns (bool)
```

_Returns true if &#x60;account&#x60; supports the interface defined by
&#x60;interfaceId&#x60;. Support for {IERC165} itself is queried automatically.

See {IERC165-supportsInterface}._

### getSupportedInterfaces

```solidity
function getSupportedInterfaces(address account, bytes4[] interfaceIds) internal view returns (bool[])
```

_Returns a boolean array where each value corresponds to the
interfaces passed in and whether they&#x27;re supported or not. This allows
you to batch check interfaces for a contract where your expectation
is that some interfaces may not be supported.

See {IERC165-supportsInterface}.

_Available since v3.4.__

### supportsAllInterfaces

```solidity
function supportsAllInterfaces(address account, bytes4[] interfaceIds) internal view returns (bool)
```

_Returns true if &#x60;account&#x60; supports all the interfaces defined in
&#x60;interfaceIds&#x60;. Support for {IERC165} itself is queried automatically.

Batch-querying can lead to gas savings by skipping repeated checks for
{IERC165} support.

See {IERC165-supportsInterface}._

### _supportsERC165Interface

```solidity
function _supportsERC165Interface(address account, bytes4 interfaceId) private view returns (bool)
```

Query if a contract implements an interface, does not check ERC165 support

_Assumes that account contains a contract that supports ERC165, otherwise
the behavior of this method is undefined. This precondition can be checked
with {supportsERC165}.
Interface identification is specified in ERC-165._

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | The address of the contract to query for support of an interface |
| interfaceId | bytes4 | The interface identifier, as specified in ERC-165 |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if the contract at account indicates support of the interface with identifier interfaceId, false otherwise |

