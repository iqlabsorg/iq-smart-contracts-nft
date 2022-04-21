import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { IUniverseRegistry, IUniverseToken } from '../../../../typechain';

const universeId = 1;

const universeParams: IUniverseRegistry.UniverseParamsStruct = {
  name: 'Universe One',
  rentalFeePercent: 1000,
};

/**
 * The contract behaves like IUniverseRegistry
 */
export function shouldBehaveLikeUniverseRegistry(): void {
  describe('IUniverseRegistry', function () {
    let universeRegistry: IUniverseRegistry;
    let universeToken: IUniverseToken;
    let deployer: SignerWithAddress;
    let stranger: SignerWithAddress;

    beforeEach(function () {
      universeRegistry = this.contracts.universeRegistry;
      universeToken = this.contracts.universeToken;
      deployer = this.signers.named.deployer;
      [stranger] = this.signers.unnamed;
    });

    describe('setUniverseTokenBaseURI', () => {
      it('sets the base URI', async () => {
        const baseURI = 'https://example.com/';
        await universeRegistry.setUniverseTokenBaseURI(baseURI);
        await expect(universeRegistry.universeTokenBaseURI()).to.eventually.eq(baseURI);
      });
    });

    describe('universeTokenBaseURI', () => {
      context('When the base URI is not set', () => {
        it('returns empty string', async () => {
          await expect(universeRegistry.universeTokenBaseURI()).to.eventually.eq('');
        });
      });

      context('When the base URI is set', () => {
        const baseURI = 'https://example.com/';
        beforeEach(async () => {
          await universeRegistry.setUniverseTokenBaseURI(baseURI);
        });

        it('returns the baseURI value', async () => {
          await expect(universeRegistry.universeTokenBaseURI()).to.eventually.eq(baseURI);
        });
      });
    });

    describe('createUniverse', () => {
      it('emits UniverseCreated event', async () => {
        const universeId = (await universeToken.currentId()).add(1);
        await expect(universeRegistry.createUniverse(universeParams))
          .to.emit(universeRegistry, 'UniverseCreated')
          .withArgs(universeId, universeParams.name);
      });

      it('mints new universe token', async () => {
        const nextUniverseTokenId = (await universeToken.currentId()).add(1);
        await universeRegistry.createUniverse(universeParams);
        await expect(universeToken.currentId()).to.eventually.eq(nextUniverseTokenId);
      });

      it('creates the universe entry', async () => {
        await universeRegistry.createUniverse(universeParams);
        await expect(universeRegistry.universe(universeId)).to.eventually.equalStruct(universeParams);
      });

      context('Empty universe name', () => {
        it('reverts', async () => {
          await expect(universeRegistry.createUniverse({ ...universeParams, name: '' })).to.be.revertedWith(
            'EmptyUniverseName()',
          );
        });
      });
    });

    describe('universeToken', () => {
      it('returns the universe token address', async () => {
        await expect(universeRegistry.universeToken()).to.eventually.eq(universeToken.address);
      });
    });

    describe('setUniverseName', () => {
      const newName = 'Universe Two';
      context('When the Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.createUniverse(universeParams);
        });

        context('When new name is empty', () => {
          it('reverts', async () => {
            await expect(universeRegistry.setUniverseName(universeId, '')).to.be.revertedWith('EmptyUniverseName()');
          });
        });

        context('When new name is valid', () => {
          //todo: check permission
          it('sets new name', async () => {
            await universeRegistry.setUniverseName(universeId, newName);
            await expect(universeRegistry.universeName(universeId)).to.eventually.eq(newName);
          });

          it('emits UniverseNameChanged event', async () => {
            await expect(universeRegistry.setUniverseName(universeId, newName))
              .to.emit(universeRegistry, `UniverseNameChanged`)
              .withArgs(universeId, newName);
          });
        });
      });

      context('When the Universe is not created', () => {
        it('reverts', async () => {
          await expect(universeRegistry.setUniverseName(universeId, newName)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('setUniverseRentalFeePercent', () => {
      const newRentalFeePercent = 3333;

      context('When the Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.createUniverse(universeParams);
        });

        //todo: check permission

        it('sets new rental fee percent', async () => {
          await universeRegistry.setUniverseRentalFeePercent(universeId, newRentalFeePercent);
          await expect(universeRegistry.universeRentalFeePercent(universeId)).to.eventually.eq(newRentalFeePercent);
        });

        it('emits UniverseRentalFeeChanged event', async () => {
          await expect(universeRegistry.setUniverseRentalFeePercent(universeId, newRentalFeePercent))
            .to.emit(universeRegistry, `UniverseRentalFeeChanged`)
            .withArgs(universeId, newRentalFeePercent);
        });
      });

      context('When the Universe is not created', () => {
        it('reverts', async () => {
          await expect(
            universeRegistry.setUniverseRentalFeePercent(universeId, newRentalFeePercent),
          ).to.be.revertedWith(`QueryForNonexistentUniverse(${universeId})`);
        });
      });
    });

    describe('universeName', () => {
      context('When the Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.createUniverse(universeParams);
        });

        it('can retrieve universe name', async () => {
          await expect(universeRegistry.universeName(universeId)).to.eventually.eq(universeParams.name);
        });
      });

      context('When the Universe is not created', () => {
        it('reverts', async () => {
          await expect(universeRegistry.universeName(universeId)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('isUniverseOwner', () => {
      context('When the Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.connect(deployer).createUniverse(universeParams);
        });

        context('When the owner address is provided', () => {
          it('returns `true`', async () => {
            await expect(universeRegistry.isUniverseOwner(universeId, deployer.address)).to.eventually.eq(true);
          });
        });

        context('When the stranger address is provided', () => {
          it('returns `false`', async () => {
            await expect(universeRegistry.isUniverseOwner(universeId, stranger.address)).to.eventually.eq(false);
          });
        });
      });

      context('When the Universe is not created', () => {
        it('reverts', async () => {
          await expect(universeRegistry.isUniverseOwner(universeId, stranger.address)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('checkUniverseOwner', () => {
      context('When the Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.connect(deployer).createUniverse(universeParams);
        });

        context('When the owner address is provided', () => {
          it('does not revert', async () => {
            await expect(universeRegistry.checkUniverseOwner(universeId, deployer.address)).to.not.be.reverted;
          });
        });

        context('When the stranger address is provided', () => {
          it('reverts', async () => {
            await expect(universeRegistry.checkUniverseOwner(universeId, stranger.address)).to.be.revertedWith(
              `AccountIsNotUniverseOwner(\\"${stranger.address}\\")`,
            );
          });
        });
      });

      context('When the Universe is not created', () => {
        it('reverts', async () => {
          await expect(universeRegistry.checkUniverseOwner(universeId, stranger.address)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('universeOwner', () => {
      context('When the Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.connect(deployer).createUniverse(universeParams);
        });

        it('returns the universe owner address', async () => {
          await expect(universeRegistry.universeOwner(universeId)).to.eventually.eq(deployer.address);
        });
      });

      context('When the Universe is not created', () => {
        it('reverts', async () => {
          await expect(universeRegistry.universeOwner(universeId)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('universeRentalFeePercent', () => {
      context('When the Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.connect(deployer).createUniverse(universeParams);
        });

        it('returns the universe fee percent', async () => {
          await expect(universeRegistry.universeRentalFeePercent(universeId)).to.eventually.eq(
            universeParams.rentalFeePercent,
          );
        });
      });

      context('When the Universe is not created', () => {
        it('reverts', async () => {
          await expect(universeRegistry.universeRentalFeePercent(universeId)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });

    describe('universe', () => {
      context('When the Universe is created', () => {
        beforeEach(async () => {
          await universeRegistry.createUniverse(universeParams);
        });

        it('returns the universe info', async () => {
          await expect(universeRegistry.universe(universeId)).to.eventually.equalStruct(universeParams);
        });
      });

      context('When the Universe is not created', () => {
        it('reverts', async () => {
          await expect(universeRegistry.universe(universeId)).to.be.revertedWith(
            `QueryForNonexistentUniverse(${universeId})`,
          );
        });
      });
    });
  });
}
