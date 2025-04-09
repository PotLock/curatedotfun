import { ReactNode } from "react";

export interface TemplateElement {
  id: string;
  title: string;
  description: string;
  template: string;
}

export interface Step {
  title: string;
  description: string;
  icon: ReactNode;
  content: ReactNode;
}
