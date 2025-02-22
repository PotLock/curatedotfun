---
sidebar_position: 2
---

# 🔄 Simple Transform Plugin

The Simple Transform plugin enables string-based transformations using [Mustache](https://mustache.github.io/) templates. Unlike the Object Transform plugin which outputs an object, this plugin outputs a formatted string. It's particularly useful for formatting messages before sending them to chat platforms.

## 🚀 Features

- **String Output**: Transform input data into a formatted text string
- **Template-based Formatting**: Use Mustache templates to format content
- **Section Support**: Use Mustache sections for conditional content

## 📝 Usage

The plugin accepts a configuration with a template string that defines how to format the output:

```json
{
  "plugin": "@curatedotfun/simple-transform",
  "config": {
    "template": "Your template string here"
  }
}
```

## 🎨 Mustache Template Syntax

### Basic Variables

Use double curly braces to insert a value:

```txt
Hello {{username}}!
```

If `username` is "Alice", outputs: `Hello Alice!`

### Optional Sections

Use `#` to start a section and `/` to end it. The section is only rendered if the value exists and is not empty:

```txt
{{#curator.notes}}
📝 Note: {{.}}
{{/curator.notes}}
```

- If `curator.notes` is "Great thread!", outputs: `📝 Note: Great thread!`
- If `curator.notes` is empty or missing, outputs nothing

### Inverted Sections

Use `^` for sections that render only when a value is missing or empty:

```txt
{{^curator.notes}}
No curator notes provided
{{/curator.notes}}
```

Only renders "No curator notes provided" if `curator.notes` is empty or missing

### Nested Values

Access nested object properties using dot notation:

```txt
Posted by {{user.profile.name}} (@{{user.handle}})
```

### Lists/Arrays

Iterate over arrays using sections:

```txt
Tags:
{{#tags}}
- {{.}}
{{/tags}}
```

If `tags` is `["crypto", "defi"]`, outputs:

```txt
Tags:
- crypto
- defi
```

## 💡 Examples

### Basic String Format

```json
{
  "plugin": "@curatedotfun/simple-transform",
  "config": {
    "template": "🔥 {{content}}\n\n{{#curator.notes}}📝 {{.}}{{/curator.notes}}\n\n🔗 Source: https://x.com/{{username}}/status/{{submissionId}}\n"
  }
}
```

Given this input:

```json
{
  "content": "Just launched our new DeFi protocol!",
  "username": "cryptobuilder",
  "submissionId": "123456789",
  "curator": {
    "notes": "Interesting launch with novel tokenomics"
  }
}
```

Outputs:

```txt
🔥 Just launched our new DeFi protocol!

📝 Interesting launch with novel tokenomics

🔗 Source: https://x.com/cryptobuilder/status/123456789
```

### Rich Format with Conditionals

```json
{
  "plugin": "@curatedotfun/simple-transform",
  "config": {
    "template": "{{#title}}📢 {{.}}\n\n{{/title}}{{content}}\n\n{{#links}}🔗 {{.}}\n{{/links}}\n{{#curator.notes}}💭 Curator's Note: {{.}}{{/curator.notes}}\n\n{{^curator.notes}}⚡ Auto-curated{{/curator.notes}}"
  }
}
```

This template:

- Shows a title section if present
- Always shows the content
- Lists all links if any exist
- Shows curator notes if present, otherwise shows "Auto-curated"

:::tip
Use this plugin when you need to format data into a text string. If you need to transform data structures between plugins, use the Object Transform plugin instead.
:::
