import React from "react";
import { Map, Newspaper, Sparkles } from "lucide-react";

// Define the TemplateElement interface if it's missing from the types file
export interface TemplateElement {
  id: string;
  title: string;
  description: string;
  template: string;
}

// Template elements data
export const templateElements: TemplateElement[] = [
  {
    id: "title",
    title: "Title",
    description: "The title of the content ({{title}})",
    template: "🔷 *{{title}}*",
  },
  {
    id: "summary",
    title: "Summary",
    description: "A summary of the content ({{summary}})",
    template: "{{summary}}",
  },
  {
    id: "author",
    title: "Author",
    description: "The author of the content ({{author}})",
    template: "👤 Source [@{{author}}](https://x.com/{{author}})",
  },
  {
    id: "sourceUrl",
    title: "Source URL",
    description: "Original content URL ({{source}})",
    template: "🔗 [Read More]({{source}})",
  },
  {
    id: "submissionDate",
    title: "Submission Date",
    description: "When the content was submitted ({{submittedAt}})",
    template: "📅 {{submittedAt}}",
  },
  {
    id: "curatorNotes",
    title: "Curator Notes",
    description: "Notes from the curator ({{curator.notes}})",
    template: "💬 Curator notes: {{curator.notes}}",
  },
];

// Step interface for type safety
export interface Step {
  title: string;
  description: string;
  icon: React.ComponentType;
}

// Step definitions (without content which will be passed as props)
export const stepDefinitions: Step[] = [
  {
    title: "Basic Content Formatter",
    description:
      "Format and structure your content for consistent presentation",
    icon: Newspaper,
  },
  {
    title: "Advanced Content Mapper",
    description:
      "Map and transform content between different formats and structures",
    icon: Map,
  },
  {
    title: "AI Content Enhancer",
    description: "Use AI to automatically enhance and optimize your content",
    icon: Sparkles,
  },
];
