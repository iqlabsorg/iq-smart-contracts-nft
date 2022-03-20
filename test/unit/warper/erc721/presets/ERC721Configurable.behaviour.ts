import { ERC721PresetConfigurable } from '../../../../../typechain';

declare module 'mocha' {
  interface Context {
    erc721PresetConfigurable: {
      underTest: ERC721PresetConfigurable;
    };
  }
}

/**
 * TODO: docs
 */
export function shouldBehaveLikeERC721PresetConfigurable(): void {
  describe('ERC721 Configurable', () => {
    it('todo');

    // TODO:
    //   describe('ensures that ERC20 interface is not supported', () => {
    //     it('reverts', async function () {
    //       const erc20 = await new ERC20Mock__factory(this.signers.named['deployer']).deploy('TEST', 'T', 1, 1);

    //       await expect(
    //         this.warper.underTest.__initialize(
    //           defaultAbiCoder.encode(['address', 'address'], [erc20.address, AddressZero]),
    //         ),
    //       ).to.be.revertedWith(`InvalidOriginalTokenInterface("${erc20.address}", "${'0x5b5e139f'}")`);
    //     });
    //   });
  });
}
