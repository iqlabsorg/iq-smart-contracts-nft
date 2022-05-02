import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { defaultAbiCoder, formatBytes32String } from 'ethers/lib/utils';
import { IWarperPresetFactory, WarperPresetMock, WarperPresetMock__factory } from '../../../typechain';
import { AccessControlledHelper, deployWarperPresetWithInitData } from '../../shared/utils';
import { beforeEach } from 'mocha';

const presetId1 = formatBytes32String('ERC721Basic');
const presetId2 = formatBytes32String('ERC721Advanced');

/**
 * Warper preset factory tests
 */
export function shouldBehaveWarperPresetFactory(): void {
  describe('Behaves like IWarperPresetFactory', () => {
    let warperPresetFactory: IWarperPresetFactory;
    let warperImpl1: WarperPresetMock;
    let warperImpl2: WarperPresetMock;

    let deployer: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(function () {
      warperPresetFactory = this.contracts.warperPresetFactory;
      warperImpl1 = this.mocks.warperPreset[0];
      warperImpl2 = this.mocks.warperPreset[1];

      deployer = this.signers.named.deployer;
      [stranger] = this.signers.unnamed;
    });

    describe('addPreset', () => {
      context('When implementation does not support IWarperPreset interface', () => {
        it('reverts', async () => {
          const randomExternalAddress = '0x120B46FF3b629b9695f5b28F1eeb84d61b462678';
          await expect(warperPresetFactory.addPreset(presetId1, randomExternalAddress)).to.be.revertedWith(
            'InvalidWarperPresetInterface',
          );
        });
      });

      context('When implementation has already been added', () => {
        beforeEach(async () => {
          await warperPresetFactory.addPreset(presetId1, warperImpl1.address);
        });
        it('reverts', async () => {
          await expect(warperPresetFactory.addPreset(presetId1, warperImpl1.address)).to.be.revertedWith(
            `DuplicateWarperPresetId("${presetId1}")`,
          );
        });
      });

      AccessControlledHelper.onlySupervisorCan(async signer => {
        const tx = await warperPresetFactory.connect(signer).addPreset(presetId1, warperImpl1.address);
        await expect(tx).to.emit(warperPresetFactory, 'WarperPresetAdded').withArgs(presetId1, warperImpl1.address);
      });
    });

    describe('removePreset', () => {
      context('When warper has been registered', () => {
        beforeEach(async function () {
          await warperPresetFactory.addPreset(presetId1, warperImpl1.address);
        });

        AccessControlledHelper.onlySupervisorCan(async signer => {
          const tx = await warperPresetFactory.connect(signer).removePreset(presetId1);

          await expect(tx).to.emit(warperPresetFactory, 'WarperPresetRemoved').withArgs(presetId1);
        });
      });

      context('When warper has not been registered', () => {
        it('does not emit an event', async () => {
          const tx = await warperPresetFactory.removePreset(presetId1);

          await expect(tx).to.not.emit(warperPresetFactory, 'WarperPresetRemoved');
        });
      });
    });

    describe('enablePreset', () => {
      context('When preset is registered', () => {
        beforeEach(async () => {
          await warperPresetFactory.addPreset(presetId1, warperImpl1.address);
        });

        context('When preset is disabled', () => {
          beforeEach(async () => {
            await warperPresetFactory.disablePreset(presetId1);
          });

          AccessControlledHelper.onlySupervisorCan(async signer => {
            const tx = await warperPresetFactory.connect(signer).enablePreset(presetId1);

            await expect(tx).to.emit(warperPresetFactory, 'WarperPresetEnabled').withArgs(presetId1);
          });
        });

        context('When preset enabled', () => {
          it('reverts', async () => {
            await expect(warperPresetFactory.enablePreset(presetId1)).to.be.revertedWith(
              `EnabledWarperPreset("${presetId1}")`,
            );
          });
        });
      });

      context('When preset is not registered', () => {
        it('reverts', async () => {
          await expect(warperPresetFactory.enablePreset(presetId1)).to.be.revertedWith(
            `WarperPresetNotRegistered("${presetId1}")`,
          );
        });
      });
    });

    describe('disablePreset', () => {
      context('When preset is registered', () => {
        beforeEach(async () => {
          await warperPresetFactory.addPreset(presetId1, warperImpl1.address);
        });

        context('When preset is enabled', () => {
          AccessControlledHelper.onlySupervisorCan(async signer => {
            const tx = await warperPresetFactory.connect(signer).disablePreset(presetId1);

            await expect(tx).to.emit(warperPresetFactory, 'WarperPresetDisabled').withArgs(presetId1);
          });
        });

        context('When preset disabled', () => {
          beforeEach(async () => {
            await warperPresetFactory.disablePreset(presetId1);
          });

          it('reverts', async () => {
            await expect(warperPresetFactory.disablePreset(presetId1)).to.be.revertedWith(
              `DisabledWarperPreset("${presetId1}")`,
            );
          });
        });
      });

      context('When preset is not registered', () => {
        it('reverts', async () => {
          await expect(warperPresetFactory.disablePreset(presetId1)).to.be.revertedWith(
            `WarperPresetNotRegistered("${presetId1}")`,
          );
        });
      });
    });

    describe('deployPreset', () => {
      context('When preset enabled', () => {
        beforeEach(async () => {
          await warperPresetFactory.addPreset(presetId1, warperImpl1.address);
        });

        context('When `initData` is empty', () => {
          it('reverts', async () => {
            await expect(warperPresetFactory.deployPreset(presetId1, '0x')).to.be.revertedWith(`EmptyPresetData()`);
          });
        });

        context('When `initData` is valid', () => {
          it('deploys successfully', async () => {
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
            const warper = new WarperPresetMock__factory(deployer).attach(warperAddress);
            await expect(warper.__original()).to.eventually.eq(originalAddress);
            await expect(warper.__metahub()).to.eventually.eq(metahubAddress);
            await expect(warper.initValue()).to.eventually.eq(15);
          });
        });
      });

      context('When preset disabled', () => {
        it('reverts', async () => {
          await expect(warperPresetFactory.deployPreset(presetId1, '0x')).to.be.revertedWith(
            `DisabledWarperPreset("${presetId1}")`,
          );
        });
      });
    });

    describe('presetEnabled', () => {
      context('When preset enabled', () => {
        beforeEach(async () => {
          await warperPresetFactory.addPreset(presetId1, warperImpl1.address);
        });

        it('returns true', async () => {
          await expect(warperPresetFactory.presetEnabled(presetId1)).to.eventually.equal(true);
        });
      });

      context('When preset disabled', () => {
        beforeEach(async () => {
          await warperPresetFactory.addPreset(presetId1, warperImpl1.address);
          await warperPresetFactory.disablePreset(presetId1);
        });

        it('returns false', async () => {
          await expect(warperPresetFactory.presetEnabled(presetId1)).to.eventually.equal(false);
        });
      });

      context('When preset not registered', () => {
        it('reverts', async () => {
          await expect(warperPresetFactory.presetEnabled(presetId1)).to.be.revertedWith(
            `WarperPresetNotRegistered(\\"${presetId1}\\")`,
          );
        });
      });
    });

    describe('presets', () => {
      context('When presets registered', () => {
        beforeEach(async () => {
          await warperPresetFactory.addPreset(presetId1, warperImpl1.address);
          await warperPresetFactory.addPreset(presetId2, warperImpl2.address);
          await warperPresetFactory.disablePreset(presetId1);
        });

        it('returns all presets', async () => {
          await expect(warperPresetFactory.presets()).to.eventually.containsAllStructs([
            {
              id: presetId1,
              implementation: warperImpl1.address,
              enabled: false,
            },
            {
              id: presetId2,
              implementation: warperImpl2.address,
              enabled: true,
            },
          ]);
        });
      });
    });

    describe('preset', () => {
      context('When preset is not registered', () => {
        it('reverts', async () => {
          await expect(warperPresetFactory.preset(presetId1)).to.be.revertedWith(
            `WarperPresetNotRegistered(\\"${presetId1}\\")`,
          );
        });
      });

      context('When preset is registered', () => {
        beforeEach(async () => {
          await warperPresetFactory.addPreset(presetId1, warperImpl1.address);
        });

        it('returns the preset', async () => {
          await expect(warperPresetFactory.preset(presetId1)).to.eventually.equalStruct({
            id: presetId1,
            implementation: warperImpl1.address,
            enabled: true,
          });
        });
      });
    });
  });
}
