import { BigNumberish, BigNumber } from 'ethers';
import { BytesLike, defaultAbiCoder, hexDataSlice, solidityKeccak256 } from 'ethers/lib/utils';
import { ASSET_CLASS, LISTING_STRATEGY } from '.';
import { Listings } from '../typechain/contracts/listing/IListingController';
import { Assets } from '../typechain/contracts/metahub/Metahub';

/**
 * Calculates ID by taking 4 byte of the provided string hashed value.
 * @param string Arbitrary string.
 */
export const solidityId = (string: string): string => {
  return hexDataSlice(solidityKeccak256(['string'], [string]), 0, 4);
};

/**
 * Creates ERC721 Asset structure.
 * @param token
 * @param tokenId
 * @param value
 */
export const makeERC721Asset = (token: string, tokenId: BigNumberish, value: BigNumberish = 1): Assets.AssetStruct => {
  return makeAsset(ASSET_CLASS.ERC721, defaultAbiCoder.encode(['address', 'uint256'], [token, tokenId]), value);
};

/**
 * Creates Fixed Price listing strategy params structure.
 * @param baseRate
 */
export const makeFixedPriceStrategy = (baseRate: BigNumberish): Listings.ParamsStruct => {
  return {
    strategy: LISTING_STRATEGY.FIXED_PRICE,
    data: defaultAbiCoder.encode(['uint256'], [baseRate]),
  };
};

/**
 * Creates Asset structure.
 * @param assetClass
 * @param data
 * @param value
 */
export const makeAsset = (assetClass: BytesLike, data: BytesLike, value: BigNumberish): Assets.AssetStruct => {
  return {
    id: { class: assetClass, data },
    value: BigNumber.from(value),
  };
};
