# Active Context

## Current Focus
Platform Stability, Database Migration, Turborepo Conversion, and Feature Enhancement

### Background
- Successfully operating with Node.js/Hono backend
- Maintaining Bun for package management and development
- Plugin system fully operational with multiple distributors and transformers
- Multiple active feeds with Twitter-based curation

### Next Phase
1. **Platform Stability**
   - Monitoring system performance
   - Ensuring reliable content processing
   - Maintaining plugin compatibility
   - Optimizing resource usage

2. **Database Migration**
   - Migrating from SQLite to PostgreSQL with Drizzle ORM
   - Implementing Docker-based development environment
   - Creating data migration scripts
   - Setting up testing infrastructure with isolated test databases

3. **Turborepo Conversion** ✓
   - Configuring proper workspace support for Bun ✓
   - Implementing Corepack for package manager versioning ✓
   - Optimizing Turborepo configuration for better caching ✓
   - Setting up integration testing for backend services ✓
   - Improving Docker configuration for Turborepo ✓
   - Implementing CI/CD with GitHub Actions ✓

4. **Feature Enhancement**
   - Expanding distributor plugins
   - Improving transformation capabilities
   - Enhancing curator experience
   - Developing recap functionality

5. **Documentation Maintenance**
   - Keeping API documentation current
   - Updating plugin development guides
   - Maintaining deployment documentation
   - Documenting configuration options

### Key Considerations
- Ensuring reliable content processing
- Supporting growing number of feeds
- Maintaining plugin compatibility
- Balancing performance and features
- **JSON sanitization throughout transformation pipeline**
- **Database scalability and performance with PostgreSQL**
- **Consistent development environment with Docker**
- **Optimized build and development workflow with Turborepo**
- **Integration testing for backend services with Docker**
- **Automated testing with GitHub Actions**

## Active Decisions

### Architecture
1. Node.js/Hono in production
   - Stable and reliable
   - Good performance characteristics
   - Native module compatibility
2. Bun for development and package management
   - Fast package management
   - Excellent developer experience
   - Strong workspace support
   - Managed via Corepack for version consistency
3. **PostgreSQL with Drizzle ORM**
   - Improved scalability over SQLite
   - Read/write separation capability
   - Transaction support with retry logic
   - Docker-based development environment
4. **Improved Backend Organization**
   - Modular route structure
   - Dedicated utility for secure file serving
   - Path traversal protection
   - Proper MIME type handling
5. **Turborepo for Monorepo Management**
   - Optimized task execution and caching
   - Workspace-aware dependency management
   - Improved development workflow
   - Integration testing infrastructure

### Plugin System
- Runtime module federation for plugins
- Type-safe plugin configuration
- Hot-reloading support
- Standardized interfaces for different plugin types

### Content Flow
- Twitter as primary content source
- Trusted curator moderation
- Configurable transformation pipeline
- Multi-channel distribution

## Current Focus Areas
1. System reliability and performance
2. Database migration to PostgreSQL
3. ~~Turborepo conversion and optimization~~ ✓
4. ~~Integration testing implementation~~ ✓
5. Plugin ecosystem expansion
6. Curator experience improvement
7. Documentation maintenance

## Next Steps
1. ~~Complete Turborepo conversion~~ ✓
2. Complete PostgreSQL migration
3. ~~Implement integration testing for backend services~~ ✓
4. ~~Optimize Docker configuration for production~~ ✓
5. Enhance recap functionality
6. Expand distributor options
7. Improve transformation capabilities
8. Optimize resource usage

## Validated Solutions
1. Twitter-based submission and moderation
2. Plugin-based architecture
3. Configuration-driven feed management
4. Multi-channel content distribution
5. **Secure static file serving with proper MIME types**
6. **JSON sanitization at key points in the transformation pipeline**

## Testing Strategy Overhaul

### Current Testing Issues
- Over-reliance on mocks instead of component-level testing
- Using fake databases instead of real ones in Docker containers
- Inconsistent test data management
- Limited HTTP integration testing
- Insufficient message queue testing
- Hidden mocks that make tests harder to understand

### Testing Approach Decision
- **Complete refactoring required** - The existing testing approach needs to be overhauled, not adapted
- Focus on component tests as primary testing strategy
- Use Docker-Compose for real database and infrastructure
- Implement a fake MQ for message queue testing
- Create a clear directory structure for different test types
- Follow Node.js testing best practices as documented in memory-bank/testingPlan.md

### Implementation Priority
1. Set up Docker-Compose for testing infrastructure
2. Create a fake MQ implementation
3. Refactor existing tests to use real database
4. Add component tests for key flows
5. Add integration tests for external services
6. Add E2E tests for full flows
