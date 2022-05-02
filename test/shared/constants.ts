import { hexDataSlice, solidityKeccak256 } from 'ethers/lib/utils';

/**
 * Calculates ID by taking 4 byte of the provided string hashed value.
 * @param string Arbitrary string.
 */
export const solidityId = (string: string): string => {
  return hexDataSlice(solidityKeccak256(['string'], [string]), 0, 4);
};

export const MAX_UINT_32 = 2 ** 32 - 1;

export const ROLES_LIBRARY = {
  ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  SUPERVISOR_ROLE: '0x060c8eced3c6b422fe5573c862b67b9f6e25a3fc7d9543b14f7aee77b138e70d',
};

export const ASSET_CLASS = {
  ERC20: solidityId('ERC20'),
  ERC721: solidityId('ERC721'),
  ERC1155: solidityId('ERC1155'),
};

export const LISTING_STRATEGY = {
  FIXED_PRICE: solidityId('FIXED_PRICE'),
};
