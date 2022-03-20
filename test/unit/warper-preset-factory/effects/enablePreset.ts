import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IWarperPresetFactory } from '../../../../typechain';
import { expectWarperPresetData, presetId1, presetId2 } from '../WarperPresetFactory.behaviour';

export function shouldBehaveEnablePreset(): void {
  describe('enable preset', function () {
    let warperPresetFactory: IWarperPresetFactory;
    let stranger: SignerWithAddress;

    beforeEach(async function () {
      warperPresetFactory = this.warperPresetFactory.underTest;

      [stranger] = this.signers.unnamed;
      await warperPresetFactory.addPreset(presetId1, this.warperPresetFactory.warperPreset1.address);
      await warperPresetFactory.addPreset(presetId2, this.warperPresetFactory.warperPreset2.address);
    });

    describe('When preset is disabled', () => {
      beforeEach(async () => {
        await warperPresetFactory.disablePreset(presetId2);
      });

      it('allows owner to enable preset', async () => {
        await expect(warperPresetFactory.enablePreset(presetId2))
          .to.emit(warperPresetFactory, 'WarperPresetEnabled')
          .withArgs(presetId2);
        await expectWarperPresetData(warperPresetFactory.preset(presetId2), { enabled: true });
      });

      it('forbids stranger to enable preset', async () => {
        await expect(warperPresetFactory.connect(stranger).enablePreset(presetId2)).to.be.revertedWith(
          'caller is not the owner',
        );
      });

      it('forbids to deploy preset', async () => {
        await expect(warperPresetFactory.deployPreset(presetId2, [])).to.be.revertedWith(
          `DisabledWarperPreset("${presetId2}")`,
        );
      });
    });
  });
}
