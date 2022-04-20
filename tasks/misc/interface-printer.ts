import { task } from 'hardhat/config';
import { InterfacePrinter__factory } from '../../typechain/factories/contracts/mocks/InterfacePrinter__factory';

task('misc:print-interfaces', 'Print interfaces IDs to the stdout').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  const printer = await new InterfacePrinter__factory(deployer).deploy();
  console.log('universeToken interfaceId: ', await printer.universeToken());
});
