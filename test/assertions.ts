import chaiAsPromised from 'chai-as-promised';
import { TASK_TEST_SETUP_TEST_ENVIRONMENT } from 'hardhat/builtin-tasks/task-names';
import { subtask } from 'hardhat/config';
import chai, { Assertion } from 'chai';

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
       * Compare two objects, but removes all of the "index" based fields
       * @param expectedStruct Object with string keys
       */
      equalStruct(expectedStruct: Record<string, any>): AsyncAssertion;
    }
  }
}

Assertion.addMethod('revertedWithError', function (error: string, ...expectedArgs: unknown[]) {
  const args = expectedArgs.map(p => (typeof p === 'string' ? `"${p}"` : p)).join(', ');
  const reason = `${error}(${args})`;

  return new Assertion(this._obj).to.be.revertedWith(reason);
});

// Override default subtask to add chai plugins
// eslint-disable-next-line require-await
subtask(TASK_TEST_SETUP_TEST_ENVIRONMENT, async (): Promise<void> => {
  chai.use(chaiAsPromised);
});

Assertion.addMethod('equalStruct', function (expectedStruct: Record<string, any>) {
  const obj = this._obj;
  const cleanedUpStruct: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    // the key is not a number (only match "stringy" keys)
    if (!/^\d+$/.test(key)) {
      cleanedUpStruct[key] = obj[key];
    }
  }
  return new Assertion(cleanedUpStruct).to.deep.equal(expectedStruct);
});
