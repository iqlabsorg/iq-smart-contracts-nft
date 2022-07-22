
## ERC721

_Implementation of https://eips.ethereum.org/EIPS/eip-721[ERC721] Non-Fungible Token Standard, including
the Metadata extension, but not including the Enumerable extension, which is available separately as
{ERC721Enumerable}._

### _name

```solidity
string _name
```

### _symbol

```solidity
string _symbol
```

### _owners

```solidity
mapping(uint256 &#x3D;&gt; address) _owners
```

### _balances

```solidity
mapping(address &#x3D;&gt; uint256) _balances
```

### _tokenApprovals

```solidity
mapping(uint256 &#x3D;&gt; address) _tokenApprovals
```

### _operatorApprovals

```solidity
mapping(address &#x3D;&gt; mapping(address &#x3D;&gt; bool)) _operatorApprovals
```

### constructor

```solidity
constructor(string name_, string symbol_) public
```

_Initializes the contract by setting a &#x60;name&#x60; and a &#x60;symbol&#x60; to the token collection._

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

_See {IERC165-supportsInterface}._

### balanceOf

```solidity
function balanceOf(address owner) public view virtual returns (uint256)
```

_See {IERC721-balanceOf}._

### ownerOf

```solidity
function ownerOf(uint256 tokenId) public view virtual returns (address)
```

_See {IERC721-ownerOf}._

### name

```solidity
function name() public view virtual returns (string)
```

_See {IERC721Metadata-name}._

### symbol

```solidity
function symbol() public view virtual returns (string)
```

_See {IERC721Metadata-symbol}._

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view virtual returns (string)
```

_See {IERC721Metadata-tokenURI}._

### _baseURI

```solidity
function _baseURI() internal view virtual returns (string)
```

_Base URI for computing {tokenURI}. If set, the resulting URI for each
token will be the concatenation of the &#x60;baseURI&#x60; and the &#x60;tokenId&#x60;. Empty
by default, can be overridden in child contracts._

### approve

```solidity
function approve(address to, uint256 tokenId) public virtual
```

_See {IERC721-approve}._

### getApproved

```solidity
function getApproved(uint256 tokenId) public view virtual returns (address)
```

_See {IERC721-getApproved}._

### setApprovalForAll

```solidity
function setApprovalForAll(address operator, bool approved) public virtual
```

_See {IERC721-setApprovalForAll}._

### isApprovedForAll

```solidity
function isApprovedForAll(address owner, address operator) public view virtual returns (bool)
```

_See {IERC721-isApprovedForAll}._

### transferFrom

```solidity
function transferFrom(address from, address to, uint256 tokenId) public virtual
```

_See {IERC721-transferFrom}._

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 tokenId) public virtual
```

_See {IERC721-safeTransferFrom}._

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 tokenId, bytes _data) public virtual
```

_See {IERC721-safeTransferFrom}._

### _safeTransfer

```solidity
function _safeTransfer(address from, address to, uint256 tokenId, bytes _data) internal virtual
```

_Safely transfers &#x60;tokenId&#x60; token from &#x60;from&#x60; to &#x60;to&#x60;, checking first that contract recipients
are aware of the ERC721 protocol to prevent tokens from being forever locked.

&#x60;_data&#x60; is additional data, it has no specified format and it is sent in call to &#x60;to&#x60;.

This internal function is equivalent to {safeTransferFrom}, and can be used to e.g.
implement alternative mechanisms to perform token transfer, such as signature-based.

Requirements:

- &#x60;from&#x60; cannot be the zero address.
- &#x60;to&#x60; cannot be the zero address.
- &#x60;tokenId&#x60; token must exist and be owned by &#x60;from&#x60;.
- If &#x60;to&#x60; refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.

Emits a {Transfer} event._

### _exists

```solidity
function _exists(uint256 tokenId) internal view virtual returns (bool)
```

_Returns whether &#x60;tokenId&#x60; exists.

Tokens can be managed by their owner or approved accounts via {approve} or {setApprovalForAll}.

Tokens start existing when they are minted (&#x60;_mint&#x60;),
and stop existing when they are burned (&#x60;_burn&#x60;)._

### _isApprovedOrOwner

```solidity
function _isApprovedOrOwner(address spender, uint256 tokenId) internal view virtual returns (bool)
```

_Returns whether &#x60;spender&#x60; is allowed to manage &#x60;tokenId&#x60;.

Requirements:

- &#x60;tokenId&#x60; must exist._

### _safeMint

```solidity
function _safeMint(address to, uint256 tokenId) internal virtual
```

_Safely mints &#x60;tokenId&#x60; and transfers it to &#x60;to&#x60;.

Requirements:

- &#x60;tokenId&#x60; must not exist.
- If &#x60;to&#x60; refers to a smart contract, it must implement {IERC721Receiver-onERC721Received}, which is called upon a safe transfer.

Emits a {Transfer} event._

### _safeMint

```solidity
function _safeMint(address to, uint256 tokenId, bytes _data) internal virtual
```

_Same as {xref-ERC721-_safeMint-address-uint256-}[&#x60;_safeMint&#x60;], with an additional &#x60;data&#x60; parameter which is
forwarded in {IERC721Receiver-onERC721Received} to contract recipients._

### _mint

```solidity
function _mint(address to, uint256 tokenId) internal virtual
```

_Mints &#x60;tokenId&#x60; and transfers it to &#x60;to&#x60;.

WARNING: Usage of this method is discouraged, use {_safeMint} whenever possible

Requirements:

- &#x60;tokenId&#x60; must not exist.
- &#x60;to&#x60; cannot be the zero address.

Emits a {Transfer} event._

### _burn

```solidity
function _burn(uint256 tokenId) internal virtual
```

_Destroys &#x60;tokenId&#x60;.
The approval is cleared when the token is burned.

Requirements:

- &#x60;tokenId&#x60; must exist.

Emits a {Transfer} event._

### _transfer

```solidity
function _transfer(address from, address to, uint256 tokenId) internal virtual
```

_Transfers &#x60;tokenId&#x60; from &#x60;from&#x60; to &#x60;to&#x60;.
 As opposed to {transferFrom}, this imposes no restrictions on msg.sender.

Requirements:

- &#x60;to&#x60; cannot be the zero address.
- &#x60;tokenId&#x60; token must be owned by &#x60;from&#x60;.

Emits a {Transfer} event._

### _approve

```solidity
function _approve(address to, uint256 tokenId) internal virtual
```

_Approve &#x60;to&#x60; to operate on &#x60;tokenId&#x60;

Emits a {Approval} event._

### _setApprovalForAll

```solidity
function _setApprovalForAll(address owner, address operator, bool approved) internal virtual
```

_Approve &#x60;operator&#x60; to operate on all of &#x60;owner&#x60; tokens

Emits a {ApprovalForAll} event._

### _checkOnERC721Received

```solidity
function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes _data) private returns (bool)
```

_Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
The call is not executed if the target address is not a contract._

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | address representing the previous owner of the given token ID |
| to | address | target address that will receive the tokens |
| tokenId | uint256 | uint256 ID of the token to be transferred |
| _data | bytes | bytes optional data to send along with the call |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | bool whether the call correctly returned the expected magic value |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual
```

_Hook that is called before any token transfer. This includes minting
and burning.

Calling conditions:

- When &#x60;from&#x60; and &#x60;to&#x60; are both non-zero, &#x60;&#x60;from&#x60;&#x60;&#x27;s &#x60;tokenId&#x60; will be
transferred to &#x60;to&#x60;.
- When &#x60;from&#x60; is zero, &#x60;tokenId&#x60; will be minted for &#x60;to&#x60;.
- When &#x60;to&#x60; is zero, &#x60;&#x60;from&#x60;&#x60;&#x27;s &#x60;tokenId&#x60; will be burned.
- &#x60;from&#x60; and &#x60;to&#x60; are never both zero.

To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks]._

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address from, address to, uint256 tokenId) internal virtual
```

_Hook that is called after any transfer of tokens. This includes
minting and burning.

Calling conditions:

- when &#x60;from&#x60; and &#x60;to&#x60; are both non-zero.
- &#x60;from&#x60; and &#x60;to&#x60; are never both zero.

To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks]._

