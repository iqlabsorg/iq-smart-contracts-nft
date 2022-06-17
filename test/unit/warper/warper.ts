/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any */
import { FakeContract, smock } from '@defi-wonderland/smock';
import { defaultAbiCoder } from 'ethers/lib/utils';
import hre from 'hardhat';
import {
  AssetClassRegistry,
  AssetClassRegistry__factory,
  ERC20Mock,
  ERC721Mock,
  ERC721Mock__factory,
  ERC721PresetConfigurable,
  ERC721WarperController,
  Metahub,
  Metahub__factory,
} from '../../../typechain';
import { shouldBehavesLikeMulticall } from '../shared/multicall.behaviour';
import { shouldBehaveLikeERC721Warper } from './erc721/erc721-warper.behaviour';
import { shouldBehaveLikeERC721PresetConfigurable } from './erc721/presets/erc721-configurable.behaviour';
import { shouldBehaveLikeAvailabilityPeriod } from './mechanics/availability-period/availability-period.behaviour';
import { shouldBehaveLikeConfigurableAvailabilityPeriod } from './mechanics/availability-period/configurable-availability-period.behaviour';
import { shouldBehaveLikeConfigurableRentalPeriod } from './mechanics/rental-period/configurable-rental-period.behaviour';
import { shouldBehaveLikeRentalPeriod } from './mechanics/rental-period/rental-period.behaviour';
import { shouldBehaveLikeWarper } from './warper.behaviour';

export async function unitFixtureERC721WarperConfigurable(): Promise<{
  erc721Warper: any;
  metahub: FakeContract<Metahub>;
  oNFT: ERC721Mock;
  erc20Token: ERC20Mock;
  uninitializedErc721Warper: ERC721PresetConfigurable;
  erc721WarperController: ERC721WarperController;
  assetClassRegistry: FakeContract<AssetClassRegistry>;
}> {
  // Deploy original asset mock.
  const oNFT = (await hre.run('deploy:mock:ERC721', {
    name: 'Test ERC721',
    symbol: 'ONFT',
  })) as ERC721Mock;

  // Deploy ERC721 Warper controller.
  const erc721WarperController = await hre.run('deploy:erc721-warper-controller');

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);
  const assetClassRegistry = await smock.fake<AssetClassRegistry>(AssetClassRegistry__factory);

  // Deploy preset.
  const erc721Warper = (await hre.run('deploy:erc721-preset-configurable')) as ERC721PresetConfigurable;
  await erc721Warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]));

  const uninitializedErc721Warper = await hre.run('deploy:erc721-preset-configurable');

  // Deploy erc20 token
  const erc20Token = (await hre.run('deploy:mock:ERC20', {
    name: 'Random ERC20',
    symbol: 'TST',
    decimals: 18,
    totalSupply: 1,
  })) as ERC20Mock;

  // Set balance to the MetaHub account so we can perform the minting operation here
  await hre.network.provider.send('hardhat_setBalance', [metahub.address, '0x99999999999999999999']);

  return {
    erc721Warper,
    metahub,
    oNFT,
    erc20Token,
    uninitializedErc721Warper,
    erc721WarperController,
    assetClassRegistry,
  };
}

export function unitTestWarpers(): void {
  describe('ERC721 Preset Configurable', function () {
    beforeEach(async function () {
      const { erc721Warper, metahub, oNFT, erc721WarperController, assetClassRegistry } = await this.loadFixture(
        unitFixtureERC721WarperConfigurable,
      );
      this.mocks.assetClassRegistry = assetClassRegistry;
      this.mocks.metahub = metahub;
      this.contracts.erc721WarperController = erc721WarperController;
      this.mocks.assets.erc721 = oNFT;

      // Mechanics under test
      this.contracts.availabilityPeriod = erc721Warper;
      this.contracts.rentalPeriod = erc721Warper;
      this.contracts.configurableAvailabilityPeriodExtension = erc721Warper;
      this.contracts.configurableRentalPeriodExtension = erc721Warper;

      // Warper contracts
      this.contracts.erc721Warper = erc721Warper;
      this.contracts.warperPreset = erc721Warper;
      this.contracts.multicall = erc721Warper;
      this.warper = {
        forwarder: {
          call: async () => {
            return ERC721Mock__factory.connect(this.contracts.erc721Warper.address, this.signers.unnamed[0]).symbol();
          },
          expected: await this.mocks.assets.erc721.symbol(),
        },
      };
    });

    shouldBehaveLikeWarper();
    shouldBehaveLikeERC721Warper();
    shouldBehaveLikeERC721PresetConfigurable();
    shouldBehavesLikeMulticall();
    shouldBehaveLikeRentalPeriod();
    shouldBehaveLikeConfigurableRentalPeriod();
    shouldBehaveLikeAvailabilityPeriod();
    shouldBehaveLikeConfigurableAvailabilityPeriod();
  });
}
