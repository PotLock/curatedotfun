import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "👋 Introduction",
    },
    {
      type: "doc",
      id: "getting-started",
      label: "🚀 Getting Started",
    },
  ],
  userGuideSidebar: [
    {
      type: "doc",
      id: "user-guides/curation",
      label: "📚 Curation",
    },
  ],
  developerGuideSidebar: [
    {
      type: "category",
      label: "🔨 Setup",
      items: ["developers/configuration", "developers/deployment"],
    },
    // {
    //   type: "category",
    //   label: "🔌 Integration",
    //   items: ["developers/plugins"],
    // },
    {
      type: "category",
      label: "🔌 Plugins",
      items: [
        {
          type: "doc",
          id: "plugins/index",
          label: "📖 Overview",
        },
        {
          type: "category",
          label: "📡 Distributors",
          items: [
            {
              type: "doc",
              id: "plugins/distributors/telegram",
              label: "📱 Telegram",
            },
            {
              type: "doc",
              id: "plugins/distributors/notion",
              label: "📝 Notion",
            },
          ],
        },
        {
          type: "category",
          label: "🔄 Transformers",
          items: [
            {
              type: "doc",
              id: "plugins/transformers/gpt-transform",
              label: "🤖 GPT Transform",
            },
            {
              type: "doc",
              id: "plugins/transformers/simple-transform",
              label: "📝 Simple Transform",
            },
          ],
        },
        {
          type: "doc",
          id: "plugins/build-plugin",
        },
      ],
    },
  ],
};

export default sidebars;
