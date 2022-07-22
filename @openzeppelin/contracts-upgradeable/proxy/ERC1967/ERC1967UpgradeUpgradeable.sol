
## ERC1967UpgradeUpgradeable

_This abstract contract provides getters and event emitting update functions for
https://eips.ethereum.org/EIPS/eip-1967[EIP1967] slots.

_Available since v4.1.__

### __ERC1967Upgrade_init

```solidity
function __ERC1967Upgrade_init() internal
```

### __ERC1967Upgrade_init_unchained

```solidity
function __ERC1967Upgrade_init_unchained() internal
```

### _ROLLBACK_SLOT

```solidity
bytes32 _ROLLBACK_SLOT
```

### _IMPLEMENTATION_SLOT

```solidity
bytes32 _IMPLEMENTATION_SLOT
```

_Storage slot with the address of the current implementation.
This is the keccak-256 hash of &quot;eip1967.proxy.implementation&quot; subtracted by 1, and is
validated in the constructor._

### Upgraded

```solidity
event Upgraded(address implementation)
```

_Emitted when the implementation is upgraded._

### _getImplementation

```solidity
function _getImplementation() internal view returns (address)
```

_Returns the current implementation address._

### _setImplementation

```solidity
function _setImplementation(address newImplementation) private
```

_Stores a new address in the EIP1967 implementation slot._

### _upgradeTo

```solidity
function _upgradeTo(address newImplementation) internal
```

_Perform implementation upgrade

Emits an {Upgraded} event._

### _upgradeToAndCall

```solidity
function _upgradeToAndCall(address newImplementation, bytes data, bool forceCall) internal
```

_Perform implementation upgrade with additional setup call.

Emits an {Upgraded} event._

### _upgradeToAndCallUUPS

```solidity
function _upgradeToAndCallUUPS(address newImplementation, bytes data, bool forceCall) internal
```

_Perform implementation upgrade with security checks for UUPS proxies, and additional setup call.

Emits an {Upgraded} event._

### _ADMIN_SLOT

```solidity
bytes32 _ADMIN_SLOT
```

_Storage slot with the admin of the contract.
This is the keccak-256 hash of &quot;eip1967.proxy.admin&quot; subtracted by 1, and is
validated in the constructor._

### AdminChanged

```solidity
event AdminChanged(address previousAdmin, address newAdmin)
```

_Emitted when the admin account has changed._

### _getAdmin

```solidity
function _getAdmin() internal view returns (address)
```

_Returns the current admin._

### _setAdmin

```solidity
function _setAdmin(address newAdmin) private
```

_Stores a new address in the EIP1967 admin slot._

### _changeAdmin

```solidity
function _changeAdmin(address newAdmin) internal
```

_Changes the admin of the proxy.

Emits an {AdminChanged} event._

### _BEACON_SLOT

```solidity
bytes32 _BEACON_SLOT
```

_The storage slot of the UpgradeableBeacon contract which defines the implementation for this proxy.
This is bytes32(uint256(keccak256(&#x27;eip1967.proxy.beacon&#x27;)) - 1)) and is validated in the constructor._

### BeaconUpgraded

```solidity
event BeaconUpgraded(address beacon)
```

_Emitted when the beacon is upgraded._

### _getBeacon

```solidity
function _getBeacon() internal view returns (address)
```

_Returns the current beacon._

### _setBeacon

```solidity
function _setBeacon(address newBeacon) private
```

_Stores a new beacon in the EIP1967 beacon slot._

### _upgradeBeaconToAndCall

```solidity
function _upgradeBeaconToAndCall(address newBeacon, bytes data, bool forceCall) internal
```

_Perform beacon upgrade with additional setup call. Note: This upgrades the address of the beacon, it does
not upgrade the implementation contained in the beacon (see {UpgradeableBeacon-_setImplementation} for that).

Emits a {BeaconUpgraded} event._

### _functionDelegateCall

```solidity
function _functionDelegateCall(address target, bytes data) private returns (bytes)
```

_Same as {xref-Address-functionCall-address-bytes-string-}[&#x60;functionCall&#x60;],
but performing a delegate call.

_Available since v3.4.__

### __gap

```solidity
uint256[50] __gap
```

_This empty reserved space is put in place to allow future versions to add new
variables without shifting down storage in the inheritance chain.
See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps_

