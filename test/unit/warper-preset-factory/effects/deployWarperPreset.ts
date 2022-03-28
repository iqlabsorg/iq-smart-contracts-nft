import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { deployWarperPreset } from '../../../shared/utils';
import { IWarperPresetFactory, WarperPresetMock, WarperPresetMock__factory } from '../../../../typechain';
import { presetId1, presetId2 } from '../WarperPresetFactory.behaviour';

export function shouldBehaveLikeDeployWarperPreset(): void {
  describe('deploy warper preset', function () {
    let warperPresetFactory: IWarperPresetFactory;
    let warperImpl1: WarperPresetMock;

    let stranger: SignerWithAddress;
    let deployer: SignerWithAddress;

    beforeEach(async function () {
      warperPresetFactory = this.interfaces.iWarperPresetFactory;

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
      const warperAddress = await deployWarperPreset(warperPresetFactory.connect(stranger), presetId1, initData);

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
}
