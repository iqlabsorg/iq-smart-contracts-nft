
## StorageSlot

_Library for reading and writing primitive types to specific storage slots.

Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
This library helps with reading and writing to such slots without the need for inline assembly.

The functions in this library return Slot structs that contain a &#x60;value&#x60; member that can be used to read or write.

Example usage to set ERC1967 implementation slot:
&#x60;&#x60;&#x60;
contract ERC1967 {
    bytes32 internal constant _IMPLEMENTATION_SLOT &#x3D; 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    function _getImplementation() internal view returns (address) {
        return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
    }

    function _setImplementation(address newImplementation) internal {
        require(Address.isContract(newImplementation), &quot;ERC1967: new implementation is not a contract&quot;);
        StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value &#x3D; newImplementation;
    }
}
&#x60;&#x60;&#x60;

_Available since v4.1 for &#x60;address&#x60;, &#x60;bool&#x60;, &#x60;bytes32&#x60;, and &#x60;uint256&#x60;.__

### AddressSlot

```solidity
struct AddressSlot {
  address value;
}
```

### BooleanSlot

```solidity
struct BooleanSlot {
  bool value;
}
```

### Bytes32Slot

```solidity
struct Bytes32Slot {
  bytes32 value;
}
```

### Uint256Slot

```solidity
struct Uint256Slot {
  uint256 value;
}
```

### getAddressSlot

```solidity
function getAddressSlot(bytes32 slot) internal pure returns (struct StorageSlot.AddressSlot r)
```

_Returns an &#x60;AddressSlot&#x60; with member &#x60;value&#x60; located at &#x60;slot&#x60;._

### getBooleanSlot

```solidity
function getBooleanSlot(bytes32 slot) internal pure returns (struct StorageSlot.BooleanSlot r)
```

_Returns an &#x60;BooleanSlot&#x60; with member &#x60;value&#x60; located at &#x60;slot&#x60;._

### getBytes32Slot

```solidity
function getBytes32Slot(bytes32 slot) internal pure returns (struct StorageSlot.Bytes32Slot r)
```

_Returns an &#x60;Bytes32Slot&#x60; with member &#x60;value&#x60; located at &#x60;slot&#x60;._

### getUint256Slot

```solidity
function getUint256Slot(bytes32 slot) internal pure returns (struct StorageSlot.Uint256Slot r)
```

_Returns an &#x60;Uint256Slot&#x60; with member &#x60;value&#x60; located at &#x60;slot&#x60;._

