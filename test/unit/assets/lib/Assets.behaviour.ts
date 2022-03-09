import { ethers } from 'hardhat';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { solidityId } from '../../../shared/utils';
import { AssetsMock } from '../../../../typechain';

const { defaultAbiCoder } = ethers.utils;

/**
 * Core functionality tests of public Universe Token
 */
export function shouldBehaveLikeAssetsLibrary(): void {
  describe('Assets library', () => {
    let assets: AssetsMock;

    beforeEach(function () {
      assets = this.mocks.assetsLib;
    });

    describe('ERC721', () => {
      const ASSET_CLASS_ERC721 = solidityId('ERC721');

      it('makes ERC721 asset', async () => {
        const value = BigNumber.from(1);
        const data = defaultAbiCoder.encode(['address', 'uint256'], ['0x9F3E5cE8E0c19E6e768b7c378D75FCd1fcFa3E92', 42]);
        await expect(assets.construct(ASSET_CLASS_ERC721, data, value)).to.eventually.equalStruct({
          id: {
            class: ASSET_CLASS_ERC721,
            data: data,
          },
          value: value,
        });
      });
    });
  });
}
