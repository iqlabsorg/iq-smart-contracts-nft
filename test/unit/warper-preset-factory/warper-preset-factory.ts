/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import hre from 'hardhat';
import { IACL, WarperPresetFactory, WarperPresetMock } from '../../../typechain';
import { shouldBehaveWarperPresetFactory } from './warper-preset-factory.behaviour';

export function unitTestWarperPresetFactory(): void {
  let acl: IACL;

  async function unitFixtureWarperPresetFactory(): Promise<{
    warperImplMock1: WarperPresetMock;
    warperImplMock2: WarperPresetMock;
    warperPresetFactory: WarperPresetFactory;
  }> {
    const warperImplMock1 = await hre.run('deploy:mock:warper-preset');
    const warperImplMock2 = await hre.run('deploy:mock:warper-preset');

    const warperPresetFactory = await hre.run('deploy:warper-preset-factory', {
      acl: acl.address,
    });

    return {
      warperImplMock1,
      warperImplMock2,
      warperPresetFactory,
    };
  }

  describe('WarperPresetFactory', function () {
    beforeEach(async function () {
      acl = this.contracts.acl;

      const { warperImplMock1, warperImplMock2, warperPresetFactory } = await this.loadFixture(
        unitFixtureWarperPresetFactory,
      );

      this.contracts.warperPresetFactory = warperPresetFactory;
      this.mocks.warperPreset = [warperImplMock1, warperImplMock2];
    });

    shouldBehaveWarperPresetFactory();
  });
}
