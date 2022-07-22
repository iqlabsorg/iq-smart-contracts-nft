
## AccessControlUpgradeable

_Contract module that allows children to implement role-based access
control mechanisms. This is a lightweight version that doesn&#x27;t allow enumerating role
members except through off-chain means by accessing the contract event logs. Some
applications may benefit from on-chain enumerability, for those cases see
{AccessControlEnumerable}.

Roles are referred to by their &#x60;bytes32&#x60; identifier. These should be exposed
in the external API and be unique. The best way to achieve this is by
using &#x60;public constant&#x60; hash digests:

&#x60;&#x60;&#x60;
bytes32 public constant MY_ROLE &#x3D; keccak256(&quot;MY_ROLE&quot;);
&#x60;&#x60;&#x60;

Roles can be used to represent a set of permissions. To restrict access to a
function call, use {hasRole}:

&#x60;&#x60;&#x60;
function foo() public {
    require(hasRole(MY_ROLE, msg.sender));
    ...
}
&#x60;&#x60;&#x60;

Roles can be granted and revoked dynamically via the {grantRole} and
{revokeRole} functions. Each role has an associated admin role, and only
accounts that have a role&#x27;s admin role can call {grantRole} and {revokeRole}.

By default, the admin role for all roles is &#x60;DEFAULT_ADMIN_ROLE&#x60;, which means
that only accounts with this role will be able to grant or revoke other
roles. More complex role relationships can be created by using
{_setRoleAdmin}.

WARNING: The &#x60;DEFAULT_ADMIN_ROLE&#x60; is also its own admin: it has permission to
grant and revoke this role. Extra precautions should be taken to secure
accounts that have been granted it._

### __AccessControl_init

```solidity
function __AccessControl_init() internal
```

### __AccessControl_init_unchained

```solidity
function __AccessControl_init_unchained() internal
```

### RoleData

```solidity
struct RoleData {
  mapping(address &#x3D;&gt; bool) members;
  bytes32 adminRole;
}
```

### _roles

```solidity
mapping(bytes32 &#x3D;&gt; struct AccessControlUpgradeable.RoleData) _roles
```

### DEFAULT_ADMIN_ROLE

```solidity
bytes32 DEFAULT_ADMIN_ROLE
```

### onlyRole

```solidity
modifier onlyRole(bytes32 role)
```

_Modifier that checks that an account has a specific role. Reverts
with a standardized message including the required role.

The format of the revert reason is given by the following regular expression:

 /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/

_Available since v4.1.__

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

_See {IERC165-supportsInterface}._

### hasRole

```solidity
function hasRole(bytes32 role, address account) public view virtual returns (bool)
```

_Returns &#x60;true&#x60; if &#x60;account&#x60; has been granted &#x60;role&#x60;._

### _checkRole

```solidity
function _checkRole(bytes32 role) internal view virtual
```

_Revert with a standard message if &#x60;_msgSender()&#x60; is missing &#x60;role&#x60;.
Overriding this function changes the behavior of the {onlyRole} modifier.

Format of the revert message is described in {_checkRole}.

_Available since v4.6.__

### _checkRole

```solidity
function _checkRole(bytes32 role, address account) internal view virtual
```

_Revert with a standard message if &#x60;account&#x60; is missing &#x60;role&#x60;.

The format of the revert reason is given by the following regular expression:

 /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/_

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) public view virtual returns (bytes32)
```

_Returns the admin role that controls &#x60;role&#x60;. See {grantRole} and
{revokeRole}.

To change a role&#x27;s admin, use {_setRoleAdmin}._

### grantRole

```solidity
function grantRole(bytes32 role, address account) public virtual
```

_Grants &#x60;role&#x60; to &#x60;account&#x60;.

If &#x60;account&#x60; had not been already granted &#x60;role&#x60;, emits a {RoleGranted}
event.

Requirements:

- the caller must have &#x60;&#x60;role&#x60;&#x60;&#x27;s admin role._

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) public virtual
```

_Revokes &#x60;role&#x60; from &#x60;account&#x60;.

If &#x60;account&#x60; had been granted &#x60;role&#x60;, emits a {RoleRevoked} event.

Requirements:

- the caller must have &#x60;&#x60;role&#x60;&#x60;&#x27;s admin role._

### renounceRole

```solidity
function renounceRole(bytes32 role, address account) public virtual
```

_Revokes &#x60;role&#x60; from the calling account.

Roles are often managed via {grantRole} and {revokeRole}: this function&#x27;s
purpose is to provide a mechanism for accounts to lose their privileges
if they are compromised (such as when a trusted device is misplaced).

If the calling account had been revoked &#x60;role&#x60;, emits a {RoleRevoked}
event.

Requirements:

- the caller must be &#x60;account&#x60;._

### _setupRole

```solidity
function _setupRole(bytes32 role, address account) internal virtual
```

_Grants &#x60;role&#x60; to &#x60;account&#x60;.

If &#x60;account&#x60; had not been already granted &#x60;role&#x60;, emits a {RoleGranted}
event. Note that unlike {grantRole}, this function doesn&#x27;t perform any
checks on the calling account.

[WARNING]
&#x3D;&#x3D;&#x3D;&#x3D;
This function should only be called from the constructor when setting
up the initial roles for the system.

Using this function in any other way is effectively circumventing the admin
system imposed by {AccessControl}.
&#x3D;&#x3D;&#x3D;&#x3D;

NOTE: This function is deprecated in favor of {_grantRole}._

### _setRoleAdmin

```solidity
function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual
```

_Sets &#x60;adminRole&#x60; as &#x60;&#x60;role&#x60;&#x60;&#x27;s admin role.

Emits a {RoleAdminChanged} event._

### _grantRole

```solidity
function _grantRole(bytes32 role, address account) internal virtual
```

_Grants &#x60;role&#x60; to &#x60;account&#x60;.

Internal function without access restriction._

### _revokeRole

```solidity
function _revokeRole(bytes32 role, address account) internal virtual
```

_Revokes &#x60;role&#x60; from &#x60;account&#x60;.

Internal function without access restriction._

### __gap

```solidity
uint256[49] __gap
```

_This empty reserved space is put in place to allow future versions to add new
variables without shifting down storage in the inheritance chain.
See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps_

