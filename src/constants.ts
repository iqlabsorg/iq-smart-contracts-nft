import { solidityId } from '.';

export const ASSET_CLASS = {
  ERC20: solidityId('ERC20'),
  ERC721: solidityId('ERC721'),
  ERC1155: solidityId('ERC1155'),
};

export const LISTING_STRATEGY = {
  FIXED_PRICE: solidityId('FIXED_PRICE'),
  FIXED_PRICE_WITH_REWARD: solidityId('FIXED_PRICE_WITH_REWARD'),
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
