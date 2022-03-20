import { smock } from '@defi-wonderland/smock';
import { expect } from 'chai';
import { defaultAbiCoder } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';
import {
  AssetClassRegistry,
  AssetClassRegistry__factory,
  ConfigurableAvailabilityPeriodExtension,
  ConfigurableRentalPeriodExtension,
  ERC721,
  ERC721Mock__factory,
  ERC721PresetConfigurable__factory,
  ERC721Warper,
  ERC721WarperController__factory,
  IAvailabilityPeriodMechanics,
  IRentalPeriodMechanics,
  IWarperPreset,
  Metahub,
  Metahub__factory,
  Multicall,
} from '../../../typechain';
import { AddressZero } from '../../shared/types';
import { shouldBehavesLikeMulticall } from '../shared/Multicall.behaviour';
import { shouldBehaveLikeERC721Warper } from './erc721/ERC721Warper.behaviour';
import { shouldBehaveLikeERC721PresetConfigurable } from './erc721/presets/ERC721Configurable.behaviour';
import { shouldBehaveLikeAvailabilityPeriod } from './mechanics/availability-period/AvailabilityPeriod.behaviour';
import { shouldBehaveLikeConfigurableAvailabilityPeriod } from './mechanics/availability-period/ConfigurableAvailabilityPeriod.behaviour';
import { shouldBehaveLikeConfigurableRentalPeriod } from './mechanics/rental-period/ConfigurableRentalPeriod.behaviour';
import { shouldBehaveLikeRentalPeriod } from './mechanics/rental-period/RentalPeriod.behaviour';
import { shouldBehaveLikeWarper } from './warper.behaviour';

export async function unitFixtureERC721WarperConfigurable() {
  // Resolve primary roles
  const deployer = await ethers.getNamedSigner('deployer');
  const nftCreator = await ethers.getNamedSigner('nftCreator');

  // Deploy original asset mock.
  const oNFT = new ERC721Mock__factory(nftCreator).attach(
    await hre.run('deploy:mock:ERC721', {
      name: 'Test ERC721',
      symbol: 'ONFT',
    }),
  );

  // Deploy ERC721 Warper controller.
  const erc721WarperController = new ERC721WarperController__factory(deployer).attach(
    await hre.run('deploy:erc721-warper-controller'),
  );

  // Fake MetaHub
  const metahub = await smock.fake<Metahub>(Metahub__factory);
  const assetClassRegistry = await smock.fake<AssetClassRegistry>(AssetClassRegistry__factory);

  // Deploy preset.
  const erc721Warper = new ERC721PresetConfigurable__factory(deployer).attach(
    await hre.run('deploy:erc721-preset-configurable'),
  );
  await erc721Warper.__initialize(defaultAbiCoder.encode(['address', 'address'], [oNFT.address, metahub.address]));

  const uninitializedErc721Warper = new ERC721PresetConfigurable__factory(deployer).attach(
    await hre.run('deploy:erc721-preset-configurable'),
  );

  // Deploy erc20 token
  const erc20Token = new ERC20Mock__factory(nftCreator).attach(
    await hre.run('deploy:mock:ERC20', {
      name: 'Random ERC20',
      symbol: 'TST',
      decimals: 18,
      totalSupply: 1,
    }),
  );

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

      this.warper = {
        underTest: erc721Warper as unknown as IWarperPreset,
        originalAsset: oNFT as unknown as ERC721,
        metahub: metahub as unknown as Metahub,
        forwarder: {
          call: () => {
            return ERC721Mock__factory.connect(erc721Warper.address, this.signers.unnamed[0]).symbol();
          },
          expected: await oNFT.symbol(),
        },
      };

      this.multicall = {
        underTest: erc721Warper as unknown as Multicall,
        call1: oNFT.interface.encodeFunctionData('mint', [this.signers.unnamed[0].address, 1]),
        call2: oNFT.interface.encodeFunctionData('mint', [this.signers.unnamed[0].address, 22]),
        call3: oNFT.interface.encodeFunctionData('mint', [this.signers.unnamed[0].address, 42]),
        assert: async tx => {
          await expect(tx).to.emit(oNFT, 'Transfer').withArgs(AddressZero, this.signers.unnamed[0].address, 1);
          await expect(tx).to.emit(oNFT, 'Transfer').withArgs(AddressZero, this.signers.unnamed[0].address, 22);
          await expect(tx).to.emit(oNFT, 'Transfer').withArgs(AddressZero, this.signers.unnamed[0].address, 42);
        },
      };

      this.erc721Warper = {
        erc721WarperController: erc721WarperController,
        metahub: metahub,
        underTest: erc721Warper as unknown as ERC721Warper,
      };

      this.rentalPeriod = {
        underTest: erc721Warper as unknown as IRentalPeriodMechanics,
      };
      this.configurableRentalPeriod = {
        underTest: erc721Warper as unknown as ConfigurableRentalPeriodExtension,
        metahub: metahub,
      };
      this.availabilityPeriod = {
        underTest: erc721Warper as unknown as IAvailabilityPeriodMechanics,
      };
      this.configurableAvailabilityPeriod = {
        underTest: erc721Warper as unknown as ConfigurableAvailabilityPeriodExtension,
        metahub: metahub,
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
