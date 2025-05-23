## Brief overview
This rule outlines a comprehensive workflow for Cline to analyze a software repository. The objective is to thoroughly understand its architecture, data flows, and key components, subsequently producing markdown documentation and actionable recommendations for improvement and standardization. This process is designed to be adaptable to various codebases.

## Analysis Workflow Steps
-   **Initial Information Gathering**:
    -   Begin with a top-level overview of the repository structure. This can be achieved using `list_files` or by reviewing an initial file manifest if provided by the system.
    -   Identify key directories (e.g., `src`, `services`, `db`, `routes`) and primary entry points (e.g., `index.ts`, `app.ts`, main schema files).
-   **Iterative Deep Dive**:
    -   Systematically request and analyze core files using the `read_file` tool. Start with foundational layers (e.g., database schemas, ORM setup, core utilities) and progress towards higher-level components (e.g., repositories, services, API controllers, application bootstrap).
    -   Pay close attention to `import` and `export` statements to map dependencies and understand relationships between different modules and files.
    -   For complex systems, analyze components layer by layer (e.g., data access -> business logic -> API presentation).
-   **Understanding Key Components**:
    -   **Data Layer**: Analyze database schema definitions, ORM configurations (if any), repository patterns, and data model structures (e.g., Zod schemas for JSONB columns).
    -   **Service Layer**: For each service, determine its primary purpose, public methods (including their arguments and return types if inferable), key dependencies (other services, repositories), and how it encapsulates business logic.
    -   **API Layer**: Examine API route definitions, how requests are handled, request/response validation mechanisms, authentication/authorization middleware, and the connection between routes and services.
    -   **Configuration Management**: Understand how application settings (global, per-feed, plugin-specific) are loaded and accessed (e.g., from files, environment variables, or database).
    -   **Plugin System (if applicable)**: Analyze how plugins are loaded, managed, and integrated (e.g., module federation, lifecycle methods).
    -   **Application Setup & Entry Point**: Review how the application is initialized, middleware is configured, and the server is started.
-   **Identifying Patterns and Flows**:
    -   Trace 2-3 critical data flows through the application (e.g., content ingestion, user authentication, request processing for a key feature).
    -   Identify common design patterns employed (e.g., Service-Oriented Architecture, Repository Pattern, Dependency Injection via ServiceProvider).
    -   Note conventions for naming, styling, and project structure.

## Documentation Output
-   **Format**: Markdown.
-   **Content**:
    -   High-level architecture overview (potentially with a Mermaid diagram).
    -   Detailed breakdown of key layers/components (Data, Service, API, Config, Plugins, etc.).
    -   Description of major data flows.
    -   List of identified patterns and conventions.
    -   Summary of each service's purpose, key methods (with arguments if possible), and its primary dependencies.
    -   Overview of the database schema.
-   **File Structure**: A main analysis document, potentially linking to more detailed documents for specific complex areas if necessary.

## Recommendations Output
-   **Format**: Markdown, potentially separate files for different categories of recommendations (e.g., `config_recommendations.md`, `rbac_recommendations.md`, `code_cleanup.md`).
-   **Content**:
    -   **Consolidation & Cleanup**: Identify redundant code, areas for simplification, and opportunities to consolidate similar functionalities.
    -   **Better Strategy**: Suggest improvements to architectural patterns, data models, or service interactions.
    -   **Files to Delete/Refactor**: Pinpoint obsolete files or those needing significant rework.
    -   **Standardization**: Propose ways to standardize coding practices, naming conventions, error handling, dependency management, etc., across the codebase.
    -   **Cross-Codebase Consistency**: Where applicable, recommend patterns or approaches observed in the analyzed repository that could be beneficially applied to other codebases for consistency.
    -   **Specific Goals**: If the user has specific goals (e.g., "move all config to DB"), recommendations should directly address how to achieve these.
-   **Actionability**: Recommendations should be specific and provide clear instructions or examples where possible.

## Interaction Style during Analysis
-   **Iterative Updates**: Provide regular updates on the learning progress and understanding of different components.
-   **Clarification**: Use `ask_followup_question` if critical information is missing or ambiguous.
-   **Tool Usage**: Primarily use `read_file` for information gathering. Use `list_files` or `search_files` if the initial file manifest is insufficient or specific patterns need to be located.
-   **User Confirmation**: After analyzing a significant chunk or a key component, summarize understanding before moving to the next, to ensure alignment. (This can be done via `plan_mode_respond`).
