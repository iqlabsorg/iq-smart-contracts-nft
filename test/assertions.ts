/* eslint-disable @typescript-eslint/no-explicit-any */
import chai, { Assertion } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { BigNumber } from 'ethers';
import { TASK_TEST_SETUP_TEST_ENVIRONMENT } from 'hardhat/builtin-tasks/task-names';
import { subtask } from 'hardhat/config';

declare global {
  //eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Chai {
    interface Eventually {
      /**
       * Assert Solidity errors.
       * @param error The Solidity error name.
       * @param expectedArgs arguments passed to the error.
       */
      revertedWithError(error: string, ...expectedArgs: unknown[]): AsyncAssertion;

      /**
       * Compare two objects, but removes all of the "index" based fields.
       * @param expectedStruct Object with string keys.
       * @param message The error mesasge.
       */
      equalStruct(expectedStruct: Record<string, any>, message?: string | undefined): AsyncAssertion;

      /**
       * Asserts that all of the structs are contained in the expected array.
       * Index and length are enforced!
       * @param structs An Array of structs.
       */
      containsAllStructs(structs: Array<Record<string, any>>): AsyncAssertion;
    }
    interface Assertion {
      /**
       * Check if the ACL reverted with the expected error message
       * @param account The signer
       * @param role The bytes32 string
       */
      revertedByACL(account: string, role: string): AsyncAssertion;

      /**
       * Compare two objects, but removes all of the "index" based fields.
       * @param expectedStruct Object with string keys.
       * @param message The error mesasge.
       */
      equalStruct(expectedStruct: Record<string, any>, message?: string | undefined): AsyncAssertion;

      /**
       * Asserts that all of the structs are contained in the expected array.
       * Index and length are enforced!
       * @param structs An Array of structs.
       */
      containsAllStructs(structs: Array<Record<string, any>>): AsyncAssertion;
    }
  }
}

Assertion.addMethod('revertedWithError', function (error: string, ...expectedArgs: unknown[]) {
  const args = expectedArgs.map(p => (typeof p === 'string' ? `"${p}"` : p)).join(', ');
  const reason = `${error}(${args})`;

  return new Assertion(this._obj).to.be.revertedWith(reason);
});

Assertion.addMethod('revertedByACL', function (account: string, role: string) {
  return new Assertion(this._obj).to.be.revertedWith(
    `AccessControl: account ${account.toLowerCase()} is missing role ${role}`,
  );
});

// Override default subtask to add chai plugins
// eslint-disable-next-line require-await
subtask(TASK_TEST_SETUP_TEST_ENVIRONMENT, async (): Promise<void> => {
  chai.use(chaiAsPromised);
});

Assertion.addMethod('containsAllStructs', function (expectedStruct: Array<Record<string, any>>) {
  for (let index = 0; index < this._obj.length; index++) {
    new Assertion(this._obj[index]).to.equalStruct(expectedStruct[index], `Item with index ${index} did not match`);
  }
});

Assertion.addMethod('equalStruct', function (expectedStruct: Record<string, any>, message?: string) {
  const cleanedUpStruct = transmuteObject(this._obj);

  return new Assertion(cleanedUpStruct).to.deep.equal(expectedStruct, message);
});

function transmuteSingleObject(key: string, object: any): any {
  // the key is not a number (only match "stringy" keys)
  if (!/^\d+$/.test(key)) {
    if (typeof object[key] === 'object') {
      // Special handling for different object classes
      if (object[key] instanceof BigNumber) {
        // BigNumbers don't get transmuted further, return them as-is
        return object[key];
      }
      return transmuteObject(object[key]);
    }
    return object[key];
  }
  return undefined;
}

function transmuteObject(object: any): Record<string, any> {
  const cleanedUpStruct: Record<string, any> = {};
  for (const key of Object.keys(object)) {
    const cleanedUpItem = transmuteSingleObject(key, object);
    if (cleanedUpItem !== undefined) {
      cleanedUpStruct[key] = cleanedUpItem;
    }
  }

  return cleanedUpStruct;
}
