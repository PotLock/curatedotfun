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

New transformation pipeline features:
- Multiple transformations can be chained
- Global transforms apply to all distributions
- Per-distributor transforms for customization
- Graceful error handling and recovery
- Type-safe transformation flow

## Recent Changes
1. Implemented new transformation pipeline
   - Added ProcessorService for orchestration
   - Enhanced TransformationService
   - Added granular error handling
   - Updated config structure for transform chains

2. Enhanced Error Handling
   - Added TransformError for transformation issues
   - Added ProcessorError for pipeline issues
   - Implemented graceful degradation
   - Added error aggregation for multiple failures

3. Updated Configuration Structure
   - Support for transform arrays
   - Global and per-distributor transforms
   - Simplified plugin configuration
   - Enhanced type safety

## Next Steps
1. Testing Infrastructure
   - Add unit tests for new services
   - Add integration tests for pipeline
   - Create test fixtures for transforms
   - Document testing patterns

2. Plugin Development
   - Create transform plugin templates
   - Document new transform capabilities
   - Add plugin validation tools
   - Create example transformers

3. Documentation
   - Update plugin documentation
   - Add transformation guides
   - Document error handling
   - Add configuration examples

## Active Decisions

### Architecture
- Transformation pipeline with global and per-distributor transforms
- Error handling with graceful degradation
- Service-based architecture with clear boundaries
- Type-safe plugin interfaces

### Technical
- Bun as the runtime environment
- File-based database with service abstraction
- Multiple content source plugins
- Configuration-driven scheduling
- Plugin-extensible endpoints

## Current Focus
1. Testing and Validation
   - Comprehensive test coverage
   - Error handling scenarios
   - Performance testing
   - Plugin validation

2. Documentation
   - Plugin development guides
   - Configuration examples
   - Error handling patterns
   - Testing guides

3. Plugin Ecosystem
   - Transform plugin templates
   - Example implementations
   - Validation tools
   - Development toolkit
