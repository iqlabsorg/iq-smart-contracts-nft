import hre from 'hardhat';
import { IACL, IWarperPresetFactory, WarperPresetMock } from '../../../typechain';
import { shouldBehaveWarperPresetFactory } from './warper-preset-factory.behaviour';

export function unitTestWarperPresetFactory(): void {
  let acl: IACL;

  async function unitFixtureWarperPresetFactory() {
    const warperImplMock1 = (await hre.run('deploy:mock:warper-preset')) as WarperPresetMock;
    const warperImplMock2 = (await hre.run('deploy:mock:warper-preset')) as WarperPresetMock;

    const warperPresetFactory = (await hre.run('deploy:warper-preset-factory', {
      acl: acl.address,
    })) as IWarperPresetFactory;

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
