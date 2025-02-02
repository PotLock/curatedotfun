import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "Introduction",
    },
    {
      type: "doc",
      id: "getting-started",
      label: "Getting Started",
    },
  ],
  userGuideSidebar: [
    {
      type: "doc",
      id: "user-guides/curation",
      label: "Curation",
    },
  ],
  developerGuideSidebar: [
    {
      type: "category",
      label: "Setup",
      items: ["developers/configuration", "developers/deployment"],
    },
    {
      type: "category",
      label: "Integration",
      items: ["developers/plugins", "developers/archive"],
    },
    {
      type: "category",
      label: "Plugins",
      items: ["plugins/telegram"],
    },
  ],
};

export default sidebars;
