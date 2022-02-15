import { ethers } from 'hardhat';
import { expect } from 'chai';
import { AssetsMock, AssetsMock__factory } from '../../../typechain';
import { BigNumber } from 'ethers';
import { solidityId } from '../../utils';

const { defaultAbiCoder } = ethers.utils;

describe('Assets Library', () => {
  let assets: AssetsMock;

  before(async () => {
    const [deployer] = await ethers.getSigners();
    assets = await new AssetsMock__factory(deployer).deploy();
  });

  describe('ERC721', () => {
    const ASSET_CLASS_ERC721 = solidityId('ERC721');
    it('makes ERC721 asset', async () => {
      const value = BigNumber.from(1);
      const data = defaultAbiCoder.encode(['address', 'uint256'], ['0x9F3E5cE8E0c19E6e768b7c378D75FCd1fcFa3E92', 42]);
      const asset = await assets.construct(ASSET_CLASS_ERC721, data, value);
      expect(asset.id.class).to.eq(ASSET_CLASS_ERC721);
      expect(asset.id.data).to.eq(data);
      expect(asset.value).to.eq(value);
    });
  });
});
