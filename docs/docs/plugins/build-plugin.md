---
sidebar_position: 4
---

# 🛠️ Building Custom Plugins

Want to build your own plugin? Follow this guide to create and publish your custom plugin.

## Getting Started

1. Use our [plugin template](https://github.com/PotLock/curatedotfun-plugin-template) to bootstrap your plugin:

```bash
git clone https://github.com/PotLock/curatedotfun-plugin-template.git your-plugin-name
cd your-plugin-name
```

2. Implement your plugin logic following the template structure
3. Publish your plugin to NPM

## Using Your Plugin

Once published, you can use your plugin in any curate.fun project:

1. Install the package:

```bash
npm install @your-org/your-plugin
```

2. Configure it in your `curate.config.json`:

```json
{
  "plugins": {
    "@your-org/your-plugin": {
      "type": "distributor", // or "transformer"
      "url": "@your-org/your-plugin" // Use the package name as the url
    }
  }
}
```

## Plugin Types

You can create two types of plugins:

- **Distributors**: Send content to external platforms (e.g., Telegram, Discord, RSS)
- **Transformers**: Modify content before distribution (e.g., AI enhancement, formatting)

## Future Improvements

:::note
Currently, plugins need to be installed at build time. We are exploring dynamic plugin loading at runtime using [module federation](https://module-federation.io/) to make the system even more flexible.
:::
