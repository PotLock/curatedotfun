---
sidebar_position: 3
---

# 🔌 Plugin Development

Learn how to extend curate.fun by developing custom plugins ⚡

## 🏗️ Plugin Architecture

The curate.fun plugin system is built on a modular architecture that supports three main types of plugins:

1. **Source Plugins**: Monitor and collect content from platforms
2. **Transformer Plugins**: Convert content from one format to another
3. **Distributor Plugins**: Send content to external platforms or services

All plugins follow standardized interfaces and are loaded dynamically using [module federation](https://module-federation.io/).

## 🧩 Plugin Interfaces

### Core Plugin Interface

All plugins implement a base interface:

```typescript
interface Plugin<TConfig extends PluginConfig> {
  initialize(config: TConfig): Promise<void>;
  shutdown?(): Promise<void>;
}
```

### Transformer Plugin Interface

```typescript
interface TransformerPlugin<TInput, TOutput, TConfig extends PluginConfig> extends Plugin<TConfig> {
  transform(args: { input: TInput; config: TConfig }): Promise<TOutput>;
}
```

### Distributor Plugin Interface

```typescript
interface DistributorPlugin<TInput, TConfig extends PluginConfig> extends Plugin<TConfig> {
  distribute(args: { input: TInput; config: TConfig }): Promise<void>;
}
```

### Source Plugin Interface

```typescript
interface SourcePlugin<TConfig extends PluginConfig> extends Plugin<TConfig> {
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
}
```

## 🚀 Development Workflow

1. **Setup Development Environment**:
   - Clone the plugin template or create a new package
   - Install dependencies with `bun install`
   - Configure module federation

2. **Implement Plugin Interface**:
   - Choose the appropriate interface (transformer, distributor, or source)
   - Implement required methods
   - Add proper error handling

3. **Test Your Plugin**:
   - Use the Plugin Manager for local testing
   - Verify functionality with sample data
   - Test error scenarios

4. **Package and Publish**:
   - Build your plugin with `bun run build`
   - Publish to npm or host the built files
   - Update documentation

## 🛠️ Development Tools

The curate.fun ecosystem provides several tools to help with plugin development:

- **Plugin Manager**: A UI tool for testing plugins during development
- **Plugin Template**: A starter template for creating new plugins
- **Type Definitions**: TypeScript interfaces for plugin development

## 📚 Best Practices

1. **Type Safety**: Use TypeScript interfaces and generics for type safety
2. **Error Handling**: Implement proper error handling and reporting
3. **Resource Management**: Clean up resources in the shutdown method
4. **Configuration Validation**: Validate plugin configuration during initialization
5. **Documentation**: Document your plugin's functionality and configuration options

## 🔗 Next Steps

For detailed implementation guides and examples, check out:

- [Build a Custom Plugin](../plugins/build-plugin.md) - Step-by-step guide
- [Transformer Plugins](../plugins/transformers/index.md) - Transform content
- [Distributor Plugins](../plugins/distributors/index.md) - Distribute content
- [Source Plugins](../plugins/sources/index.md) - Collect content
