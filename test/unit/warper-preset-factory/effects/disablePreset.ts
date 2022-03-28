import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IWarperPresetFactory } from '../../../../typechain';
import { expectWarperPresetData, presetId1, presetId2 } from '../WarperPresetFactory.behaviour';

export function shouldBehaveLikeDisablePreset(): void {
  describe('disable preset', function () {
    let warperPresetFactory: IWarperPresetFactory;
    let stranger: SignerWithAddress;

    beforeEach(async function () {
      warperPresetFactory = this.interfaces.iWarperPresetFactory;

      [stranger] = this.signers.unnamed;
      await warperPresetFactory.addPreset(presetId1, this.mocks.warperPreset[0].address);
      await warperPresetFactory.addPreset(presetId2, this.mocks.warperPreset[1].address);
    });

    it('allows owner to disable preset', async () => {
      await expect(warperPresetFactory.disablePreset(presetId2))
        .to.emit(warperPresetFactory, 'WarperPresetDisabled')
        .withArgs(presetId2);
      await expectWarperPresetData(warperPresetFactory.preset(presetId2), { enabled: false });
    });

    it('forbids stranger to disable preset', async () => {
      await expect(warperPresetFactory.connect(stranger).disablePreset(presetId2)).to.be.revertedWith(
        'caller is not the owner',
      );
    });
  });
}
