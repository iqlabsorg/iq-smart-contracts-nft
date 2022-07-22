
## ClonesUpgradeable

_https://eips.ethereum.org/EIPS/eip-1167[EIP 1167] is a standard for
deploying minimal proxy contracts, also known as &quot;clones&quot;.

&gt; To simply and cheaply clone contract functionality in an immutable way, this standard specifies
&gt; a minimal bytecode implementation that delegates all calls to a known, fixed address.

The library includes functions to deploy a proxy using either &#x60;create&#x60; (traditional deployment) or &#x60;create2&#x60;
(salted deterministic deployment). It also includes functions to predict the addresses of clones deployed using the
deterministic method.

_Available since v3.4.__

### clone

```solidity
function clone(address implementation) internal returns (address instance)
```

_Deploys and returns the address of a clone that mimics the behaviour of &#x60;implementation&#x60;.

This function uses the create opcode, which should never revert._

### cloneDeterministic

```solidity
function cloneDeterministic(address implementation, bytes32 salt) internal returns (address instance)
```

_Deploys and returns the address of a clone that mimics the behaviour of &#x60;implementation&#x60;.

This function uses the create2 opcode and a &#x60;salt&#x60; to deterministically deploy
the clone. Using the same &#x60;implementation&#x60; and &#x60;salt&#x60; multiple time will revert, since
the clones cannot be deployed twice at the same address._

### predictDeterministicAddress

```solidity
function predictDeterministicAddress(address implementation, bytes32 salt, address deployer) internal pure returns (address predicted)
```

_Computes the address of a clone deployed using {Clones-cloneDeterministic}._

### predictDeterministicAddress

```solidity
function predictDeterministicAddress(address implementation, bytes32 salt) internal view returns (address predicted)
```

_Computes the address of a clone deployed using {Clones-cloneDeterministic}._

