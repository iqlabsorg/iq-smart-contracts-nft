
## Initializable

_This is a base contract to aid in writing upgradeable contracts, or any kind of contract that will be deployed
behind a proxy. Since proxied contracts do not make use of a constructor, it&#x27;s common to move constructor logic to an
external initializer function, usually called &#x60;initialize&#x60;. It then becomes necessary to protect this initializer
function so it can only be called once. The {initializer} modifier provided by this contract will have this effect.

The initialization functions use a version number. Once a version number is used, it is consumed and cannot be
reused. This mechanism prevents re-execution of each &quot;step&quot; but allows the creation of new initialization steps in
case an upgrade adds a module that needs to be initialized.

For example:

[.hljs-theme-light.nopadding]
&#x60;&#x60;&#x60;
contract MyToken is ERC20Upgradeable {
    function initialize() initializer public {
        __ERC20_init(&quot;MyToken&quot;, &quot;MTK&quot;);
    }
}
contract MyTokenV2 is MyToken, ERC20PermitUpgradeable {
    function initializeV2() reinitializer(2) public {
        __ERC20Permit_init(&quot;MyToken&quot;);
    }
}
&#x60;&#x60;&#x60;

TIP: To avoid leaving the proxy in an uninitialized state, the initializer function should be called as early as
possible by providing the encoded function call as the &#x60;_data&#x60; argument to {ERC1967Proxy-constructor}.

CAUTION: When used with inheritance, manual care must be taken to not invoke a parent initializer twice, or to ensure
that all initializers are idempotent. This is not verified automatically as constructors are by Solidity.

[CAUTION]
&#x3D;&#x3D;&#x3D;&#x3D;
Avoid leaving a contract uninitialized.

An uninitialized contract can be taken over by an attacker. This applies to both a proxy and its implementation
contract, which may impact the proxy. To prevent the implementation contract from being used, you should invoke
the {_disableInitializers} function in the constructor to automatically lock it when it is deployed:

[.hljs-theme-light.nopadding]
&#x60;&#x60;&#x60;
/// @custom:oz-upgrades-unsafe-allow constructor
constructor() {
    _disableInitializers();
}
&#x60;&#x60;&#x60;
&#x3D;&#x3D;&#x3D;&#x3D;_

### _initialized

```solidity
uint8 _initialized
```

_Indicates that the contract has been initialized._

### _initializing

```solidity
bool _initializing
```

_Indicates that the contract is in the process of being initialized._

### Initialized

```solidity
event Initialized(uint8 version)
```

_Triggered when the contract has been initialized or reinitialized._

### initializer

```solidity
modifier initializer()
```

_A modifier that defines a protected initializer function that can be invoked at most once. In its scope,
&#x60;onlyInitializing&#x60; functions can be used to initialize parent contracts. Equivalent to &#x60;reinitializer(1)&#x60;._

### reinitializer

```solidity
modifier reinitializer(uint8 version)
```

_A modifier that defines a protected reinitializer function that can be invoked at most once, and only if the
contract hasn&#x27;t been initialized to a greater version before. In its scope, &#x60;onlyInitializing&#x60; functions can be
used to initialize parent contracts.

&#x60;initializer&#x60; is equivalent to &#x60;reinitializer(1)&#x60;, so a reinitializer may be used after the original
initialization step. This is essential to configure modules that are added through upgrades and that require
initialization.

Note that versions can jump in increments greater than 1; this implies that if multiple reinitializers coexist in
a contract, executing them in the right order is up to the developer or operator._

### onlyInitializing

```solidity
modifier onlyInitializing()
```

_Modifier to protect an initialization function so that it can only be invoked by functions with the
{initializer} and {reinitializer} modifiers, directly or indirectly._

### _disableInitializers

```solidity
function _disableInitializers() internal virtual
```

_Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
to any version. It is recommended to use this to lock implementation contracts that are designed to be called
through proxies._

### _setInitializedVersion

```solidity
function _setInitializedVersion(uint8 version) private returns (bool)
```

