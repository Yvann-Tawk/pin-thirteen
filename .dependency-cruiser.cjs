// Layers point downward only: web -> registry -> circuit-core. See ARCHITECTURE.md.
module.exports = {
  forbidden: [
    {
      name: 'core-is-pure',
      severity: 'error',
      from: { path: '^packages/circuit-core' },
      to: { path: '^(apps|packages/(registry|design-system))|node_modules/(react|idb|zustand)' },
    },
    {
      name: 'registry-no-ui',
      severity: 'error',
      from: { path: '^packages/registry' },
      to: { path: '^(apps|packages/design-system)|node_modules/(react|idb|zustand)' },
    },
    {
      name: 'packages-no-app',
      severity: 'error',
      from: { path: '^packages' },
      to: { path: '^apps' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
