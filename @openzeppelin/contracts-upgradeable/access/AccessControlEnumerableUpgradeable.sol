
## AccessControlEnumerableUpgradeable

_Extension of {AccessControl} that allows enumerating the members of each role._

### __AccessControlEnumerable_init

```solidity
function __AccessControlEnumerable_init() internal
```

### __AccessControlEnumerable_init_unchained

```solidity
function __AccessControlEnumerable_init_unchained() internal
```

### _roleMembers

```solidity
mapping(bytes32 &#x3D;&gt; struct EnumerableSetUpgradeable.AddressSet) _roleMembers
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

_See {IERC165-supportsInterface}._

### getRoleMember

```solidity
function getRoleMember(bytes32 role, uint256 index) public view virtual returns (address)
```

_Returns one of the accounts that have &#x60;role&#x60;. &#x60;index&#x60; must be a
value between 0 and {getRoleMemberCount}, non-inclusive.

Role bearers are not sorted in any particular way, and their ordering may
change at any point.

WARNING: When using {getRoleMember} and {getRoleMemberCount}, make sure
you perform all queries on the same block. See the following
https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296[forum post]
for more information._

### getRoleMemberCount

```solidity
function getRoleMemberCount(bytes32 role) public view virtual returns (uint256)
```

_Returns the number of accounts that have &#x60;role&#x60;. Can be used
together with {getRoleMember} to enumerate all bearers of a role._

### _grantRole

```solidity
function _grantRole(bytes32 role, address account) internal virtual
```

_Overload {_grantRole} to track enumerable memberships_

### _revokeRole

```solidity
function _revokeRole(bytes32 role, address account) internal virtual
```

_Overload {_revokeRole} to track enumerable memberships_

### __gap

```solidity
uint256[49] __gap
```

_This empty reserved space is put in place to allow future versions to add new
variables without shifting down storage in the inheritance chain.
See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps_

