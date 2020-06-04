import Babel from 'rollup-plugin-babel';
import Resolve from '@rollup/plugin-node-resolve';

export default [
  'index',
].map((name) => {
  return {
    input: `src/${name}.mjs`,
    output: {
      file: `./${name}.js`,
      format: 'umd',
      name: 'RelaksRouteManager',
      exports: 'named',
    },
    plugins: [
      Babel({
        presets: [
          '@babel/env',
        ],
      }),
      Resolve(),
    ]
  };
});
