
## CountersUpgradeable

_Provides counters that can only be incremented, decremented or reset. This can be used e.g. to track the number
of elements in a mapping, issuing ERC721 ids, or counting request ids.

Include with &#x60;using Counters for Counters.Counter;&#x60;_

### Counter

```solidity
struct Counter {
  uint256 _value;
}
```

### current

```solidity
function current(struct CountersUpgradeable.Counter counter) internal view returns (uint256)
```

### increment

```solidity
function increment(struct CountersUpgradeable.Counter counter) internal
```

### decrement

```solidity
function decrement(struct CountersUpgradeable.Counter counter) internal
```

### reset

```solidity
function reset(struct CountersUpgradeable.Counter counter) internal
```

