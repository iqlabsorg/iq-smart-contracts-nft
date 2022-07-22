
## IAccessControl

_External interface of AccessControl declared to support ERC165 detection._

### RoleAdminChanged

```solidity
event RoleAdminChanged(bytes32 role, bytes32 previousAdminRole, bytes32 newAdminRole)
```

_Emitted when &#x60;newAdminRole&#x60; is set as &#x60;&#x60;role&#x60;&#x60;&#x27;s admin role, replacing &#x60;previousAdminRole&#x60;

&#x60;DEFAULT_ADMIN_ROLE&#x60; is the starting admin for all roles, despite
{RoleAdminChanged} not being emitted signaling this.

_Available since v3.1.__

### RoleGranted

```solidity
event RoleGranted(bytes32 role, address account, address sender)
```

_Emitted when &#x60;account&#x60; is granted &#x60;role&#x60;.

&#x60;sender&#x60; is the account that originated the contract call, an admin role
bearer except when using {AccessControl-_setupRole}._

### RoleRevoked

```solidity
event RoleRevoked(bytes32 role, address account, address sender)
```

_Emitted when &#x60;account&#x60; is revoked &#x60;role&#x60;.

&#x60;sender&#x60; is the account that originated the contract call:
  - if using &#x60;revokeRole&#x60;, it is the admin role bearer
  - if using &#x60;renounceRole&#x60;, it is the role bearer (i.e. &#x60;account&#x60;)_

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```

_Returns &#x60;true&#x60; if &#x60;account&#x60; has been granted &#x60;role&#x60;._

### getRoleAdmin

```solidity
function getRoleAdmin(bytes32 role) external view returns (bytes32)
```

_Returns the admin role that controls &#x60;role&#x60;. See {grantRole} and
{revokeRole}.

To change a role&#x27;s admin, use {AccessControl-_setRoleAdmin}._

### grantRole

```solidity
function grantRole(bytes32 role, address account) external
```

_Grants &#x60;role&#x60; to &#x60;account&#x60;.

If &#x60;account&#x60; had not been already granted &#x60;role&#x60;, emits a {RoleGranted}
event.

Requirements:

- the caller must have &#x60;&#x60;role&#x60;&#x60;&#x27;s admin role._

### revokeRole

```solidity
function revokeRole(bytes32 role, address account) external
```

_Revokes &#x60;role&#x60; from &#x60;account&#x60;.

If &#x60;account&#x60; had been granted &#x60;role&#x60;, emits a {RoleRevoked} event.

Requirements:

- the caller must have &#x60;&#x60;role&#x60;&#x60;&#x27;s admin role._

### renounceRole

```solidity
function renounceRole(bytes32 role, address account) external
```

_Revokes &#x60;role&#x60; from the calling account.

Roles are often managed via {grantRole} and {revokeRole}: this function&#x27;s
purpose is to provide a mechanism for accounts to lose their privileges
if they are compromised (such as when a trusted device is misplaced).

If the calling account had been granted &#x60;role&#x60;, emits a {RoleRevoked}
event.

Requirements:

- the caller must be &#x60;account&#x60;._

