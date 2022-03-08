import { FakeContract } from '@defi-wonderland/smock';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import type { Fixture } from 'ethereum-waffle';
import { constants } from 'ethers';
import { formatBytes32String } from 'ethers/lib/utils';
import {
  Metahub,
  ERC721Mock,
  ERC721PresetConfigurable,
  ERC721Warper,
  UniverseToken,
  WarperPresetFactory,
  WarperPresetMock,
  ERC20Mock,
  IWarperPreset,
  AssetsMock,
  ERC721AssetVault,
  Warper,
  IAssetController,
} from '../../typechain';
import { ACL } from '../../typechain/ACL';

declare module 'mocha' {
  interface Context {
    contracts: Contracts;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    mocks: Mocks;
    signers: Signers;
  }
}

export interface Contracts {
  metahub: Metahub;
  universeToken: UniverseToken;
  warperPresetFactory: WarperPresetFactory;
  erc721assetVault: ERC721AssetVault;
  assetController: IAssetController;
  warper: Warper;
  erc721Warper: ERC721Warper;
  warperPreset: IWarperPreset;
  acl: ACL;
  presets: {
    erc721Configurable: ERC721PresetConfigurable;
  };
}

export interface Mocks {
  metahub: FakeContract<Metahub>;
  assetsLib: AssetsMock;
  assets: {
    erc721: ERC721Mock;
    erc20: ERC20Mock;
  };
  warperPreset: Array<WarperPresetMock>;
}

export interface Signers {
  named: Record<string, SignerWithAddress>;
  unnamed: Array<SignerWithAddress>;
}

export const AddressZero = constants.AddressZero;
