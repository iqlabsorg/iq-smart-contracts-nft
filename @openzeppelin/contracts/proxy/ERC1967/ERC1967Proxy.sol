
## ERC1967Proxy

_This contract implements an upgradeable proxy. It is upgradeable because calls are delegated to an
implementation address that can be changed. This address is stored in storage in the location specified by
https://eips.ethereum.org/EIPS/eip-1967[EIP1967], so that it doesn&#x27;t conflict with the storage layout of the
implementation behind the proxy._

### constructor

```solidity
constructor(address _logic, bytes _data) public payable
```

_Initializes the upgradeable proxy with an initial implementation specified by &#x60;_logic&#x60;.

If &#x60;_data&#x60; is nonempty, it&#x27;s used as data in a delegate call to &#x60;_logic&#x60;. This will typically be an encoded
function call, and allows initializating the storage of the proxy like a Solidity constructor._

### _implementation

```solidity
function _implementation() internal view virtual returns (address impl)
```

_Returns the current implementation address._
