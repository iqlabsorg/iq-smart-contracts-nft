import { solidityId } from '.';

export const ASSET_CLASS = {
  ERC20: solidityId('ERC20'),
  ERC721: solidityId('ERC721'),
  ERC1155: solidityId('ERC1155'),
};

export const LISTING_STRATEGY = {
  FIXED_PRICE: solidityId('FIXED_PRICE'),
};

/**
 * Typescript mapping of the possible warper rental states.
 * Mimics the `WarperRentalStatus` enum.
 */
export const ASSET_RENTAL_STATUS = {
  NONE: 0,
  AVAILABLE: 1,
  RENTED: 2,
};
