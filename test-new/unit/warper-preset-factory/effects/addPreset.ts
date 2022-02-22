import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { WarperPresetFactory, WarperPresetMock } from '../../../../typechain';
import { expectWarperPresetData, presetId1, presetId2 } from '../WarperPresetFactory';

export function shouldBehaveLikeAddingANewPreset(): void {
  describe('add a new preset', function () {
    let warperPresetFactory: WarperPresetFactory;
    let warperImpl1: WarperPresetMock;
    let warperImpl2: WarperPresetMock;

    let stranger: SignerWithAddress;

    beforeEach(function () {
      warperPresetFactory = this.contracts.warperPresetFactory;
      [warperImpl1, warperImpl2] = this.mocks.warperPreset;

      [stranger] = this.signers.unnamed;
    });

    describe('When adding new warper preset', () => {
      it('ensures preset implementation has correct interface', async () => {
        const randomExternalAddress = '0x120B46FF3b629b9695f5b28F1eeb84d61b462678';
        await expect(warperPresetFactory.addPreset(presetId1, randomExternalAddress)).to.be.revertedWith(
          'InvalidWarperPresetInterface',
        );
      });

      it('allows owner to add new preset', async () => {
        await expect(warperPresetFactory.addPreset(presetId1, warperImpl1.address))
          .to.emit(warperPresetFactory, 'WarperPresetAdded')
          .withArgs(presetId1, warperImpl1.address);
      });

      it('forbids stranger to add preset', async () => {
        await expect(
          warperPresetFactory.connect(stranger).addPreset(presetId1, warperImpl1.address),
        ).to.be.revertedWith('caller is not the owner');
      });
    });

    describe('When presets are added', () => {
      beforeEach(async () => {
        await warperPresetFactory.addPreset(presetId1, warperImpl1.address);
        await warperPresetFactory.addPreset(presetId2, warperImpl2.address);
      });

      it('ensures preset ID is unique', async () => {
        await expect(warperPresetFactory.addPreset(presetId1, warperImpl1.address)).to.be.revertedWith(
          `DuplicateWarperPresetId("${presetId1}")`,
        );
      });

      it('returns preset list', async () => {
        const presets = await warperPresetFactory.presets();

        expect(presets).to.have.length(2);
        await expectWarperPresetData(presets[0], {
          id: presetId1,
          implementation: warperImpl1.address,
          enabled: true,
        });
        await expectWarperPresetData(presets[1], {
          id: presetId2,
          implementation: warperImpl2.address,
          enabled: true,
        });
      });

      it('returns preset by ID', async () => {
        await expectWarperPresetData(warperPresetFactory.preset(presetId1), {
          id: presetId1,
          implementation: warperImpl1.address,
          enabled: true,
        });
      });
    });
  });
}
