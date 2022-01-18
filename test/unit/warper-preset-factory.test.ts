import { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signers';
import {
  DummyWarperMock,
  DummyWarperMock__factory,
  WarperPresetFactory,
  WarperPresetFactory__factory,
} from '../../typechain';
import { expect } from 'chai';
import { wait } from '../utils';

const { formatBytes32String, defaultAbiCoder } = ethers.utils;

const expectWarperPresetData = async (preset: unknown | Promise<unknown>, data: Record<string, unknown>) => {
  const object = preset instanceof Promise ? await preset : preset;
  expect({ ...object }).to.include(data);
};

describe('Warper Preset Factory', () => {
  const presetId1 = formatBytes32String('ERC721Basic');
  const presetId2 = formatBytes32String('ERC721Advanced');

  let deployer: SignerWithAddress;
  let stranger: SignerWithAddress;
  let factory: WarperPresetFactory;
  let dummyWarperFactory: DummyWarperMock__factory;
  let warperImpl1: DummyWarperMock;
  let warperImpl2: DummyWarperMock;

  before(async () => {
    deployer = await ethers.getNamedSigner('deployer');
    [stranger] = await ethers.getUnnamedSigners();
    dummyWarperFactory = new DummyWarperMock__factory(deployer);
    warperImpl1 = await dummyWarperFactory.deploy();
    warperImpl2 = await dummyWarperFactory.deploy();
  });

  beforeEach(async () => {
    factory = await new WarperPresetFactory__factory(deployer).deploy();
  });

  it('returns empty preset list', async () => {
    await expect(factory.presets()).to.eventually.deep.eq([]);
  });

  describe('When adding new warper preset', () => {
    it('ensures preset implementation has correct interface', async () => {
      const randomExternalAddress = '0x120B46FF3b629b9695f5b28F1eeb84d61b462678';
      await expect(factory.addPreset(presetId1, randomExternalAddress)).to.be.revertedWithError(
        'InvalidWarperPresetInterface',
      );
    });

    it('allows owner to add new preset', async () => {
      await expect(factory.addPreset(presetId1, warperImpl1.address))
        .to.emit(factory, 'WarperPresetAdded')
        .withArgs(presetId1, warperImpl1.address);
    });

    it('forbids stranger to add preset', async () => {
      await expect(factory.connect(stranger).addPreset(presetId1, warperImpl1.address)).to.be.revertedWith(
        'caller is not the owner',
      );
    });
  });

  describe('When presets are added', () => {
    beforeEach(async () => {
      await factory.addPreset(presetId1, warperImpl1.address);
      await factory.addPreset(presetId2, warperImpl2.address);
    });

    it('ensures preset ID is unique', async () => {
      await expect(factory.addPreset(presetId1, warperImpl1.address)).to.be.revertedWithError(
        'DuplicateWarperPresetId',
        presetId1,
      );
    });

    it('returns preset list', async () => {
      const presets = await factory.presets();

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
      await expectWarperPresetData(factory.preset(presetId1), {
        id: presetId1,
        implementation: warperImpl1.address,
        enabled: true,
      });
    });

    it('allows owner to disable preset', async () => {
      await expect(factory.disablePreset(presetId2)).to.emit(factory, 'WarperPresetDisabled').withArgs(presetId2);
      await expectWarperPresetData(factory.preset(presetId2), { enabled: false });
    });

    it('forbids stranger to disable preset', async () => {
      await expect(factory.connect(stranger).disablePreset(presetId2)).to.be.revertedWith('caller is not the owner');
    });

    it('allows owner to remove preset', async () => {
      await expect(factory.removePreset(presetId2)).to.emit(factory, 'WarperPresetRemoved').withArgs(presetId2);
      await expectWarperPresetData(factory.preset(presetId2), { id: formatBytes32String('') });
    });

    it('forbids stranger to remove preset', async () => {
      await expect(factory.connect(stranger).removePreset(presetId2)).to.be.revertedWith('caller is not the owner');
    });

    it('allows anyone to deploy a warper from preset', async () => {
      // Prepare dummy warper init data.
      const originalAddress = '0x385D56903e7e5Fb8acE2C2209070A58Bf6f7D8bc';
      const metahubAddress = '0xa3E8c8F56f1c8a0e08F2BF7216b31D9CDAd79fF7';

      const defaultInitData = warperImpl1.interface.encodeFunctionData('iqInitialize', [
        defaultAbiCoder.encode(['address', 'address'], [originalAddress, metahubAddress]),
      ]);
      const customInitData = warperImpl1.interface.encodeFunctionData('customInitialize', [
        defaultAbiCoder.encode(['uint256'], [42]),
      ]);

      // Deploy warper and get address from event.
      const receipt = await wait(factory.connect(stranger).deployPreset(presetId1, [defaultInitData, customInitData]));
      const events = await factory.queryFilter(
        factory.filters.WarperPresetDeployed(presetId1, null),
        receipt.blockNumber,
      );
      const warperAddress = events[0].args.warper;

      // Assert warper is deployed and initialized correctly.
      expect(warperAddress).to.be.properAddress;
      const warper = dummyWarperFactory.attach(warperAddress);
      await expect(warper.getInitValue()).to.eventually.eq(42);
      await expect(warper.iqOriginal()).to.eventually.eq(originalAddress);
      await expect(warper.iqMetahub()).to.eventually.eq(metahubAddress);
    });

    describe('When preset is disabled', () => {
      beforeEach(async () => {
        await factory.disablePreset(presetId2);
      });

      it('allows owner to enable preset', async () => {
        await expect(factory.enablePreset(presetId2)).to.emit(factory, 'WarperPresetEnabled').withArgs(presetId2);
        await expectWarperPresetData(factory.preset(presetId2), { enabled: true });
      });

      it('forbids stranger to enable preset', async () => {
        await expect(factory.connect(stranger).enablePreset(presetId2)).to.be.revertedWith('caller is not the owner');
      });

      it('forbids to deploy preset', async () => {
        await expect(factory.deployPreset(presetId2, [])).to.be.revertedWithError('DisabledWarperPreset', presetId2);
      });
    });
  });
});
