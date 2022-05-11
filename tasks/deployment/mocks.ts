/* eslint-disable sonarjs/no-duplicate-string */
import { BigNumberish } from 'ethers';
import { parseEther } from 'ethers/lib/utils';
import { task, types } from 'hardhat/config';
import {
  ERC20Mock__factory,
  ERC721Mock__factory,
  InterfacePrinter__factory,
  WarperPresetMock__factory,
} from '../../typechain';
import { ERC721InternalTest__factory } from '../../typechain/factories/contracts/mocks/ERC721InternalTest__factory';

const TOTAL_TOKENS = 1_000_000_000;
const TOKEN_DECIMALS = 18;

task('deploy:mock:ERC20', 'Deploy an ERC20 contract')
  .addParam('name', 'name of the mock token', 'TEST', types.string)
  .addParam('symbol', 'symbol of the mock token', 'TT', types.string)
  .addParam('decimals', 'decimal points', TOKEN_DECIMALS, types.int)
  .addParam('totalSupply', 'amount of tokens', TOTAL_TOKENS, types.int)
  .setAction(
    async (
      {
        name,
        symbol,
        decimals,
        totalSupply,
      }: { name: string; symbol: string; decimals: string; totalSupply: BigNumberish },
      hre,
    ) => {
      const deployer = await hre.ethers.getNamedSigner('deployer');

      await hre.deployments.delete('ERC20Mock');

      const deployment = await hre.deployments.deploy('ERC20Mock', {
        from: deployer.address,
        args: [name, symbol, decimals, parseEther(totalSupply.toString())],
        log: true,
      });
      console.log('ERC20Mock deployed', deployment.address);

      return new ERC20Mock__factory(deployer).attach(deployment.address);
    },
  );

task('deploy:mock:ERC721', 'Deploy an ERC721 contract')
  .addParam('name', 'name of the mock token', 'TEST', types.string)
  .addParam('symbol', 'symbol of the mock token', 'TT', types.string)
  .setAction(async ({ name, symbol }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    await hre.deployments.delete('ERC721Mock');

    const deployment = await hre.deployments.deploy('ERC721Mock', {
      from: deployer.address,
      args: [name, symbol],
      log: true,
    });
    console.log('ERC721Mock deployed', deployment.address);

    return new ERC721Mock__factory(deployer).attach(deployment.address);
  });

task('deploy:mock:ERC721-internal-tests', 'Deploy an ERC721 contract where anyone can mint tokens and set their URIs')
  .addParam('name', 'name of the mock token', 'TEST', types.string)
  .addParam('symbol', 'symbol of the mock token', 'TT', types.string)
  .setAction(async ({ name, symbol }, hre) => {
    const deployer = await hre.ethers.getNamedSigner('deployer');

    await hre.deployments.delete('ERC721InternalTest');

    const deployment = await hre.deployments.deploy('ERC721InternalTest', {
      from: deployer.address,
      args: [name, symbol],
      log: true,
    });
    console.log('ERC721InternalTest deployed', deployment.address);

    return new ERC721InternalTest__factory(deployer).attach(deployment.address);
  });

task('deploy:mock:warper-preset', 'Deploy an `WarperPresetMock` contract').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  await hre.deployments.delete('WarperPresetMock');

  const deployment = await hre.deployments.deploy('WarperPresetMock', {
    from: deployer.address,
    args: [],
    log: true,
  });
  console.log('WarperPresetMock deployed', deployment.address);

  return new WarperPresetMock__factory(deployer).attach(deployment.address);
});

task('deploy:interfaces-printer', 'Print interfaces IDs to the stdout').setAction(async (_args, hre) => {
  const deployer = await hre.ethers.getNamedSigner('deployer');

  await hre.deployments.delete('InterfacePrinter');

  const deployment = await hre.deployments.deploy('InterfacePrinter', {
    from: deployer.address,
    log: true,
  });
  console.log('InterfacePrinter deployed', deployment.address);

  return new InterfacePrinter__factory(deployer).attach(deployment.address);
});

export {};
