# Active Context

## Current State

### Active Feeds
Based on curate.config.json, the following feeds are actively enabled (stream.enabled = true):
- Crypto Grant Wire (grants)
- This Week in Ethereum (ethereum)
- NEARWEEK (near)
- AI x Crypto News (ai3)
- AI News (ai)
- REFI DAO (refi)
- DeSci World (DeSci)
- DAO Latest (DAO)
- Shippost
- Web3 Fundraising (cryptofundraise)
- American Crypto (usa)

### Distribution Channels
Currently configured distribution plugins:
- Telegram (@curatedotfun/telegram)
- RSS (@curatedotfun/rss)
- Notion (@curatedotfun/notion)
- Supabase (@curatedotfun/supabase)

### Content Transformation
Active transformer plugins:
- GPT Transform (@curatedotfun/gpt-transform)
- Simple Transform (@curatedotfun/simple-transform)

## Recent Changes
1. Initial documentation of the system architecture and components
2. Identified need for module federation implementation
3. Planning platform-agnostic submission service
4. Planning cron job and recap system implementation
5. Planning plugin endpoint registration system

## Next Steps
1. Implement Module Federation
   - Set up plugin loader with runtime loading
   - Implement hot-reloading
   - Add plugin caching and invalidation
   - Create plugin development toolkit

2. Refactor Submission Service
   - Make platform-agnostic
   - Support multiple source plugins
   - Improve testing infrastructure
   - Optimize performance

3. Implement Scheduling System
   - Configure cron jobs from config
   - Set up recap generation
   - Add plugin-specific scheduled tasks
   - Implement execution monitoring

4. Plugin System Enhancements
   - Add endpoint registration capability
   - Improve plugin testing support
   - Create mock system
   - Document plugin development process

## Active Decisions

### Architecture
- Module federation for plugin loading
- Platform-agnostic submission system
- Enhanced plugin capabilities
- Scheduled task infrastructure
- Optimized processing pipeline

### Technical
- Bun as the runtime environment
- File-based database with service abstraction
- Multiple content source plugins
- Configuration-driven scheduling
- Plugin-extensible endpoints

## Current Focus
1. Module Federation Implementation
   - Plugin loader development
   - Hot-reloading system
   - Type-safe plugin interfaces

2. Service Architecture
   - Platform-agnostic design
   - Performance optimization
   - Testing infrastructure

3. Plugin System
   - Endpoint registration
   - Scheduled tasks
   - Development toolkit

4. Documentation
   - Plugin development guides
   - API documentation
   - Testing guides
