
## UUPSUpgradeable

_An upgradeability mechanism designed for UUPS proxies. The functions included here can perform an upgrade of an
{ERC1967Proxy}, when this contract is set as the implementation behind such a proxy.

A security mechanism ensures that an upgrade does not turn off upgradeability accidentally, although this risk is
reinstated if the upgrade retains upgradeability but removes the security mechanism, e.g. by replacing
&#x60;UUPSUpgradeable&#x60; with a custom implementation of upgrades.

The {_authorizeUpgrade} function must be overridden to include access restriction to the upgrade mechanism.

_Available since v4.1.__

### __UUPSUpgradeable_init

```solidity
function __UUPSUpgradeable_init() internal
```

### __UUPSUpgradeable_init_unchained

```solidity
function __UUPSUpgradeable_init_unchained() internal
```

### __self

```solidity
address __self
```

### onlyProxy

```solidity
modifier onlyProxy()
```

_Check that the execution is being performed through a delegatecall call and that the execution context is
a proxy contract with an implementation (as defined in ERC1967) pointing to self. This should only be the case
for UUPS and transparent proxies that are using the current contract as their implementation. Execution of a
function through ERC1167 minimal proxies (clones) would not normally pass this test, but is not guaranteed to
fail._

### notDelegated

```solidity
modifier notDelegated()
```

_Check that the execution is not being performed through a delegate call. This allows a function to be
callable on the implementing contract but not through proxies._

### proxiableUUID

```solidity
function proxiableUUID() external view virtual returns (bytes32)
```

_Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the
implementation. It is used to validate that the this implementation remains valid after an upgrade.

IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks
bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this
function revert if invoked through a proxy. This is guaranteed by the &#x60;notDelegated&#x60; modifier._

### upgradeTo

```solidity
function upgradeTo(address newImplementation) external virtual
```

_Upgrade the implementation of the proxy to &#x60;newImplementation&#x60;.

Calls {_authorizeUpgrade}.

Emits an {Upgraded} event._

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable virtual
```

_Upgrade the implementation of the proxy to &#x60;newImplementation&#x60;, and subsequently execute the function call
encoded in &#x60;data&#x60;.

Calls {_authorizeUpgrade}.

Emits an {Upgraded} event._

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address newImplementation) internal virtual
```

_Function that should revert when &#x60;msg.sender&#x60; is not authorized to upgrade the contract. Called by
{upgradeTo} and {upgradeToAndCall}.

Normally, this function will use an xref:access.adoc[access control] modifier such as {Ownable-onlyOwner}.

&#x60;&#x60;&#x60;solidity
function _authorizeUpgrade(address) internal override onlyOwner {}
&#x60;&#x60;&#x60;_

### __gap

```solidity
uint256[50] __gap
```

_This empty reserved space is put in place to allow future versions to add new
variables without shifting down storage in the inheritance chain.
See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps_

