/** @type {import('extension').FileConfig} */
const profile = (name) => `./dist/extension-profile-${name}`;
const startingUrl = "https://example.com";
const ciFlags = process.env.CI ? ["--no-sandbox", "--disable-gpu"] : [];

export default {
  browser: {
    chrome: { profile: profile("chrome"), startingUrl, browserFlags: ciFlags },
    chromium: {
      profile: profile("chromium"),
      startingUrl,
      browserFlags: ciFlags,
    },
    edge: { profile: profile("edge"), startingUrl, browserFlags: ciFlags },
    firefox: { profile: profile("firefox"), startingUrl },
    "chromium-based": {
      profile: profile("chromium-based"),
      startingUrl,
      browserFlags: ciFlags,
    },
    "gecko-based": { profile: profile("gecko-based"), startingUrl },
  },
  config: (config = {}) => {
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];

    // Pre-strip TypeScript types from standalone .svelte.ts files
    // BEFORE Extension.js's svelte loader processes them
    config.module.rules.unshift({
      test: /\.svelte\.ts$/,
      exclude: /node_modules/,
      use: [
        {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: {
                syntax: "typescript",
              },
              target: "es2022",
            },
          },
        },
      ],
    });

    return config;
  },
};
