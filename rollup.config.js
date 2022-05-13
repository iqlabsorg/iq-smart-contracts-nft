/* eslint-disable */
import ts from 'rollup-plugin-ts';
import del from 'rollup-plugin-delete';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import autoExternal from 'rollup-plugin-auto-external';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const buildPluginsSection = () => [
  del({ targets: 'dist/*' }),
  nodeResolve(),
  commonjs(),
  ts({
    tsconfig: 'tsconfig.build.json',
  }),
  autoExternal(),
  terser({
    output: {
      comments: false,
    },
  }),
];

const buildConfig = ({ pkg, plugins }) => {
  return {
    input: 'src/index.ts',
    output: [
      {
        file: pkg.module,
        format: 'esm',
      },
      {
        file: pkg.main,
        format: 'cjs',
      },
    ],
    plugins: plugins ?? buildPluginsSection(pkg),
  };
};

export default buildConfig({ pkg });
