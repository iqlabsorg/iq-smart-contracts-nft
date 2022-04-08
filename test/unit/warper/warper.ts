import { smock } from '@defi-wonderland/smock';
import { defaultAbiCoder } from 'ethers/lib/utils';
import hre from 'hardhat';
import {
  AssetClassRegistry,
  AssetClassRegistry__factory,
  ConfigurableAvailabilityPeriodExtension__factory,
  ConfigurableRentalPeriodExtension__factory,
  ERC721Mock__factory,
  IAvailabilityPeriodMechanics__factory,
  IERC721Warper__factory,
  IRentalPeriodMechanics__factory,
  IWarperPreset__factory,
  Metahub,
  Metahub__factory,
  Multicall__factory,
  IERC721WarperController,
  ERC721Mock,
  ERC721PresetConfigurable,
  ERC20Mock,
} from '../../../typechain';
import { shouldBehavesLikeMulticall } from '../shared/Multicall.behaviour';
import { shouldBehaveLikeERC721Warper } from './erc721/ERC721Warper.behaviour';
import { shouldBehaveLikeERC721PresetConfigurable } from './erc721/presets/ERC721Configurable.behaviour';
import { shouldBehaveLikeAvailabilityPeriod } from './mechanics/availability-period/AvailabilityPeriod.behaviour';
import { shouldBehaveLikeConfigurableAvailabilityPeriod } from './mechanics/availability-period/ConfigurableAvailabilityPeriod.behaviour';
import { shouldBehaveLikeConfigurableRentalPeriod } from './mechanics/rental-period/ConfigurableRentalPeriod.behaviour';
import { shouldBehaveLikeRentalPeriod } from './mechanics/rental-period/RentalPeriod.behaviour';
import { shouldBehaveLikeWarper } from './warper.behaviour';

export async function unitFixtureERC721WarperConfigurable() {
  // Deploy original asset mock.
  const oNFT = (await hre.run('deploy:mock:ERC721', {
    name: 'Test ERC721',
    symbol: 'ONFT',
  })) as ERC721Mock;

  // Deploy ERC721 Warper controller.
  const erc721WarperController = (await hre.run('deploy:erc721-warper-controller')) as IERC721WarperController;

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);
  const assetClassRegistry = await smock.fake<AssetClassRegistry>(AssetClassRegistry__factory);

  // Deploy preset.
  const erc721Warper = (await hre.run('deploy:erc721-preset-configurable')) as ERC721PresetConfigurable;
  await erc721Warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]));

  const uninitializedErc721Warper = (await hre.run('deploy:erc721-preset-configurable')) as ERC721PresetConfigurable;

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
      this.contracts.availabilityPeriod = IAvailabilityPeriodMechanics__factory.connect(
        erc721Warper.address,
        erc721Warper.signer,
      );
      this.contracts.rentalPeriod = IRentalPeriodMechanics__factory.connect(erc721Warper.address, erc721Warper.signer);
      this.contracts.configurableAvailabilityPeriodExtension = ConfigurableAvailabilityPeriodExtension__factory.connect(
        erc721Warper.address,
        erc721Warper.signer,
      );
      this.contracts.configurableRentalPeriodExtension = ConfigurableRentalPeriodExtension__factory.connect(
        erc721Warper.address,
        erc721Warper.signer,
      );

      // Warper contracts
      this.contracts.erc721Warper = IERC721Warper__factory.connect(erc721Warper.address, erc721Warper.signer);
      this.contracts.warperPreset = IWarperPreset__factory.connect(erc721Warper.address, erc721Warper.signer);
      this.contracts.multicall = Multicall__factory.connect(erc721Warper.address, erc721Warper.signer);
      this.warper = {
        forwarder: {
          call: () => {
            return ERC721Mock__factory.connect(erc721Warper.address, this.signers.unnamed[0]).symbol();
          },
          expected: await oNFT.symbol(),
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
