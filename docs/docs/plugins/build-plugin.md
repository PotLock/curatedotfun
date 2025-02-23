---
sidebar_position: 4
---

# 🛠️ Building Custom Plugins

Want to build your own plugin? Follow this guide to create and publish your custom plugin that can be loaded remotely using [module federation](https://module-federation.io/).

## Plugin Types

You can create three types of plugins:

- **Sources**: Monitor and collect content from platforms (e.g., Twitter, Telegram)
- **Distributors**: Send content to external platforms (e.g., Telegram, Notion, RSS)
- **Transformers**: Modify content before distribution (e.g., AI enhancement, formatting)

## Development Tools

:::tip
We provide a [Plugin Manager](https://github.com/PotLock/curatedotfun-plugins/tree/main/apps/example) for local development and testing. This tool allows you to test plugins without installing them in a project.
:::

### Plugin Manager Features
- Local plugin registry management
- Real-time plugin testing
- Environment variable configuration
- Plugin validation tools

### Getting Started with Plugin Development

1. Use our [plugin template](https://github.com/PotLock/curatedotfun-plugin-template) to bootstrap your plugin:
```bash
git clone https://github.com/PotLock/curatedotfun-plugin-template.git your-plugin-name
cd your-plugin-name
```


2. Start the Plugin Manager:
```bash
git clone https://github.com/PotLock/curatedotfun-plugins.git
cd curatedotfun-plugins
bun install
bun run start
```

:::info
Your plugin doesn't need to be in the curatedotfun-plugins repository. You can develop it anywhere and add it to the Plugin Manager's registry.
:::

3. Implement your plugin following the template structure:
   ```typescript
   // src/index.ts
   import type { Plugin, PluginConfig } from '@curatedotfun/types';

   export interface YourPluginConfig extends PluginConfig {
     // Your plugin's configuration type
   }

   const plugin: Plugin<YourPluginConfig> = {
     // Plugin implementation
   };

   export default plugin;
   ```

## Module Federation Setup

Your plugin must expose itself as a module federation remote:

```javascript
// webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'your_plugin',
      filename: 'remoteEntry.js',
      exposes: {
        './plugin': './src/index',
      },
    }),
  ],
};
```

## Development Workflow

1. Start your plugin's development server
2. Add your plugin to the Plugin Manager registry:
```json
{
  "@your-org/your-plugin": {
    "url": "http://localhost:3001/remoteEntry.js",
    "type": "distributor" // or "transformer"
  }
}
```

:::note Environment Variables
Plugins can access environment variables in their configuration using the `{VARIABLE_NAME}` syntax. For example:
```json
{
  "config": {
    "apiKey": "{OPENROUTER_API_KEY}",
    "botToken": "{TELEGRAM_BOT_TOKEN}"
  }
}
```
Add these variables to the Plugin Manager's `.env` file during development.
:::

## Testing Your Plugin

Use the Plugin Manager's UI to:
- Test content transformation (for transformer plugins)
- Test content distribution (for distributor plugins)
- Validate plugin configuration
- Monitor plugin performance

:::caution
Always test your plugin thoroughly in the Plugin Manager before deploying. This helps catch configuration issues and ensures proper functionality.
:::

## Deployment

1. Deploy your plugin to a static hosting service (e.g., Vercel, Netlify)
2. Configure it in curate.config.json:
```json
{
  "plugins": {
    "@your-org/your-plugin": {
      "type": "distributor", // or "transformer"
      "url": "https://your-plugin-url.com/remoteEntry.js"
    }
  }
}
```

:::tip
You can find example plugins in our [curatedotfun-plugins repository](https://github.com/PotLock/curatedotfun-plugins) for reference.
:::
