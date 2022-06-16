/* eslint-disable @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call */
import { task } from 'hardhat/config';
import { InterfacePrinter__factory } from '../../typechain';

task('misc:print-interfaces', 'Print interfaces IDs to the stdout').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');
  const printer = await new InterfacePrinter__factory(deployer).deploy();
  const interfaces = await printer.interfaces();
  console.table(interfaces, ['name', 'id']);
});
