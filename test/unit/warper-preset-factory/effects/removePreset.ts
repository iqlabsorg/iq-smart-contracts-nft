import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { formatBytes32String } from 'ethers/lib/utils';
import { IWarperPresetFactory } from '../../../../typechain';
import { expectWarperPresetData, presetId1, presetId2 } from '../WarperPresetFactory.behaviour';

export function shouldBehaveLikeRemovePreset(): void {
  describe('remove preset', function () {
    let warperPresetFactory: IWarperPresetFactory;
    let stranger: SignerWithAddress;

    beforeEach(async function () {
      warperPresetFactory = this.contracts.warperPresetFactory;

      [stranger] = this.signers.unnamed;
      await warperPresetFactory.addPreset(presetId1, this.mocks.warperPreset[0].address);
      await warperPresetFactory.addPreset(presetId2, this.mocks.warperPreset[1].address);
    });

    it('allows owner to remove preset', async () => {
      await expect(warperPresetFactory.removePreset(presetId2))
        .to.emit(warperPresetFactory, 'WarperPresetRemoved')
        .withArgs(presetId2);
      await expectWarperPresetData(warperPresetFactory.preset(presetId2), { id: formatBytes32String('') });
    });

    it('forbids stranger to remove preset', async () => {
      await expect(warperPresetFactory.connect(stranger).removePreset(presetId2)).to.be.revertedWith(
        'caller is not the owner',
      );
    });
  });
}
