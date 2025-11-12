module.exports = {
  root: true,
  // Provide a minimal override for the web app (Next.js). Avoid referencing React Native ESLint
  // config on the build server where that package may not be installed.
  overrides: [
    {
      files: ['web-app/**'],
      extends: 'next/core-web-vitals'
    }
  ]
};
