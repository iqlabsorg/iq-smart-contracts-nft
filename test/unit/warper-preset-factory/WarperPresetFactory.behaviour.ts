import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { defaultAbiCoder, formatBytes32String } from 'ethers/lib/utils';
import { IWarperPresetFactory, WarperPresetMock, WarperPresetMock__factory } from '../../../typechain';
import { AccessControlledHelper, deployWarperPresetWithInitData } from '../../shared/utils';

const presetId1 = formatBytes32String('ERC721Basic');
const presetId2 = formatBytes32String('ERC721Advanced');

const expectWarperPresetData = async (preset: unknown | Promise<unknown>, data: Record<string, unknown>) => {
  const object = preset instanceof Promise ? await preset : preset;
  expect({ ...object }).to.include(data);
};

/**
 * Warper preset factory tests
 */
export function shouldBehaveWarperPresetFactory(): void {
  let warperPresetFactory: IWarperPresetFactory;

  beforeEach(function () {
    warperPresetFactory = this.contracts.warperPresetFactory;
  });

  describe('add a new preset', function () {
    let warperImpl1: WarperPresetMock;
    let warperImpl2: WarperPresetMock;

    beforeEach(function () {
      warperImpl1 = this.mocks.warperPreset[0];
      warperImpl2 = this.mocks.warperPreset[1];
    });

    describe('When adding new warper preset', () => {
      it('ensures preset implementation has correct interface', async () => {
        const randomExternalAddress = '0x120B46FF3b629b9695f5b28F1eeb84d61b462678';
        await expect(warperPresetFactory.addPreset(presetId1, randomExternalAddress)).to.be.revertedWith(
          'InvalidWarperPresetInterface',
        );
      });

      AccessControlledHelper.onlySupervisorCan(async signer => {
        const tx = await warperPresetFactory.connect(signer).addPreset(presetId1, warperImpl1.address);
        await expect(tx).to.emit(warperPresetFactory, 'WarperPresetAdded').withArgs(presetId1, warperImpl1.address);
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

  describe('deploy warper preset', function () {
    let warperImpl1: WarperPresetMock;

    let stranger: SignerWithAddress;
    let deployer: SignerWithAddress;

    beforeEach(async function () {
      deployer = this.signers.named['deployer'];
      [stranger] = this.signers.unnamed;

      await warperPresetFactory.addPreset(presetId1, this.mocks.warperPreset[0].address);
      await warperPresetFactory.addPreset(presetId2, this.mocks.warperPreset[1].address);

      warperImpl1 = this.mocks.warperPreset[0];
    });

    it('allows anyone to deploy a warper from preset', async () => {
      // Prepare dummy warper init data.
      const originalAddress = '0x385D56903e7e5Fb8acE2C2209070A58Bf6f7D8bc';
      const metahubAddress = '0xa3E8c8F56f1c8a0e08F2BF7216b31D9CDAd79fF7';

      const initData = warperImpl1.interface.encodeFunctionData('__initialize', [
        defaultAbiCoder.encode(
          ['address', 'address', 'bytes'],
          [originalAddress, metahubAddress, defaultAbiCoder.encode(['uint256', 'uint256'], [10, 5])],
        ),
      ]);

      // Deploy warper and get address from event.
      const warperAddress = await deployWarperPresetWithInitData(
        warperPresetFactory.connect(stranger),
        presetId1,
        initData,
      );

      // Assert warper is deployed and initialized correctly.
      expect(warperAddress).to.be.properAddress;
      const warper = new WarperPresetMock__factory(deployer).attach(warperAddress);
      await expect(warper.__original()).to.eventually.eq(originalAddress);
      await expect(warper.__metahub()).to.eventually.eq(metahubAddress);
      await expect(warper.initValue()).to.eventually.eq(15);
    });

    it('forbids deployment with empty init data', async () => {
      await expect(warperPresetFactory.deployPreset(presetId1, '0x')).to.be.revertedWith('EmptyPresetData');
    });
  });

  describe('disable preset', function () {
    beforeEach(async function () {
      await warperPresetFactory.addPreset(presetId1, this.mocks.warperPreset[0].address);
      await warperPresetFactory.addPreset(presetId2, this.mocks.warperPreset[1].address);
    });

    AccessControlledHelper.onlySupervisorCan(async signer => {
      const tx = await warperPresetFactory.connect(signer).disablePreset(presetId2);

      await expect(tx).to.emit(warperPresetFactory, 'WarperPresetDisabled').withArgs(presetId2);
      await expectWarperPresetData(warperPresetFactory.preset(presetId2), { enabled: false });
    });
  });

  describe('enable preset', function () {
    beforeEach(async function () {
      await warperPresetFactory.addPreset(presetId1, this.mocks.warperPreset[0].address);
      await warperPresetFactory.addPreset(presetId2, this.mocks.warperPreset[1].address);
    });

    describe('When preset is disabled', () => {
      beforeEach(async () => {
        await warperPresetFactory.disablePreset(presetId2);
      });

      AccessControlledHelper.onlySupervisorCan(async signer => {
        const tx = await warperPresetFactory.connect(signer).enablePreset(presetId2);

        await expect(tx).to.emit(warperPresetFactory, 'WarperPresetEnabled').withArgs(presetId2);
        await expectWarperPresetData(warperPresetFactory.preset(presetId2), { enabled: true });
      });

      it('forbids to deploy preset', async () => {
        await expect(warperPresetFactory.deployPreset(presetId2, [])).to.be.revertedWith(
          `DisabledWarperPreset("${presetId2}")`,
        );
      });
    });
  });

  describe('remove preset', function () {
    beforeEach(async function () {
      await warperPresetFactory.addPreset(presetId1, this.mocks.warperPreset[0].address);
      await warperPresetFactory.addPreset(presetId2, this.mocks.warperPreset[1].address);
    });

    AccessControlledHelper.onlySupervisorCan(async signer => {
      const tx = await warperPresetFactory.connect(signer).removePreset(presetId2);
      await expect(tx).to.emit(warperPresetFactory, 'WarperPresetRemoved').withArgs(presetId2);
      await expectWarperPresetData(warperPresetFactory.preset(presetId2), { id: formatBytes32String('') });
    });
  });
}
