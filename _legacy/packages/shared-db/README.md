# shared-db

Defines the database schema and Zod validators for the core data entities. It provides a single source of truth for how this data is structured, usable by any service needing to interact with the main database (primarily the Gateway itself, and potentially Bot Workers for read-only access).
