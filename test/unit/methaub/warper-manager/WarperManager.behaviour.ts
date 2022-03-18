import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ERC721Mock, ERC721Mock__factory, IWarperManager, IWarperPresetFactory } from '../../../../typechain';
import { deployWarper } from '../../../shared/utils';
import { warperPresetId } from '../Metahub';

declare module 'mocha' {
  interface Context {
    warperManager: {
      underTest: IWarperManager;
      warperPresetFactory: IWarperPresetFactory;
      originalAsset: ERC721Mock;
      universeId?: BigNumber;
    };
  }
}

/**
 * The metahub contract behaves like IWarperManager
 */
export function shouldBehaveLikeWarperManager(): void {
  describe('IWarperManager', function () {
    let warperManager: IWarperManager;
    let warperPresetFactory: IWarperPresetFactory;
    let originalAsset: ERC721Mock;

    let deployer: SignerWithAddress;
    let stranger: SignerWithAddress;
    let universeId: BigNumber;

    beforeEach(function () {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      universeId = this.warperManager.universeId!;
      ({ underTest: warperManager, warperPresetFactory, originalAsset } = this.warperManager);

      deployer = this.signers.named['deployer'];
      [stranger] = this.signers.unnamed;
    });

    describe('When Universe is created', () => {
      it.skip('allows to deploy a warper from preset', async () => {
        const warperAddress = await deployWarper(warperManager, universeId, originalAsset.address, warperPresetId);

        // Use original asset interface with warper address.
        const warper = new ERC721Mock__factory(deployer).attach(warperAddress);
        await expect(warper.name()).to.eventually.eq('Test ERC721');
        await expect(warper.symbol()).to.eventually.eq('ONFT');
      });

      it('verifies universe ownership upon warper deployment', async () => {
        await expect(
          warperManager.connect(stranger).deployWarper(universeId, originalAsset.address, warperPresetId),
        ).to.be.revertedWith(`AccountIsNotUniverseOwner("${stranger.address}")`);
      });
    });

    context('warperPresetFactory', () => {
      it('returns the warper preset factory address', async () => {
        await expect(warperManager.warperPresetFactory()).to.eventually.eq(warperPresetFactory.address);
      });
    });

    describe.skip('When warpers are deployed & registered', () => {
      let warperAddress1: string;
      let warperAddress2: string;

      beforeEach(async () => {
        warperAddress1 = await deployWarper(warperManager, universeId, originalAsset.address, warperPresetId);
        warperAddress2 = await deployWarper(warperManager, universeId, originalAsset.address, warperPresetId);
      });

      context('universeWarpers', () => {
        it('returns a list of warpers for universe', async () => {
          await expect(warperManager.universeWarpers(universeId)).to.eventually.deep.eq([
            warperAddress1,
            warperAddress2,
          ]);
        });
      });

      context('assetWarper', () => {
        it('returns a list of warpers for original asset', async () => {
          await expect(warperManager.assetWarpers(originalAsset.address)).to.eventually.deep.eq([
            warperAddress1,
            warperAddress2,
          ]);
        });
      });
    });
  });
}
