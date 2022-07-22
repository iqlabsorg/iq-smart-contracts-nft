
## IBeacon

_This is the interface that {BeaconProxy} expects of its beacon._

### implementation

```solidity
function implementation() external view returns (address)
```

_Must return an address that can be used as a delegate call target.

{BeaconProxy} will check that this address is a contract._

