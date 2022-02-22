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
} from '../../typechain';

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
  presets: {
    core: ERC721Warper;
    erc721Configurable: ERC721PresetConfigurable;
  };
}

export interface Mocks {
  metahub: FakeContract<Metahub>;
  assets: {
    erc721: ERC721Mock;
  };
  warperPreset: Array<WarperPresetMock>;
}

export interface Signers {
  named: Record<string, SignerWithAddress>;
  unnamed: Array<SignerWithAddress>;
}

export const AddressZero = constants.AddressZero;
export const warperPresetId = formatBytes32String('ERC721Basic');
