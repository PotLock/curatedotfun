# Product Context

## Product Overview

curate.fun is a content curation platform that aggregates and distributes curated content across various blockchain and technology domains. The platform uses Twitter as its primary content source and leverages a network of trusted curators for content moderation. It transforms and distributes content to multiple channels including Telegram, RSS feeds, Notion databases, and NEAR Social.

## User Personas

### Content Curators
- **Description**: Community members who identify and submit valuable content
- **Goals**: 
  - Share interesting content with the community
  - Build reputation as a curator
  - Contribute to knowledge sharing
- **Pain Points**: 
  - Finding the right content to share
  - Getting recognition for curation efforts
  - Understanding submission guidelines

### Feed Moderators
- **Description**: Trusted community members who approve or reject submissions
- **Goals**: 
  - Maintain high content quality
  - Filter out spam or irrelevant content
  - Ensure consistent content flow
- **Pain Points**: 
  - Managing high volume of submissions
  - Making consistent moderation decisions
  - Balancing quality vs. quantity

### Content Consumers
- **Description**: End users who consume the curated content
- **Goals**: 
  - Access high-quality, relevant content
  - Stay updated on latest developments
  - Discover new ideas and projects
- **Pain Points**: 
  - Information overload
  - Finding trustworthy sources
  - Accessing content in preferred format

### Platform Administrators
- **Description**: Team members who manage the platform
- **Goals**: 
  - Ensure platform reliability
  - Add new features and integrations
  - Monitor system performance
- **Pain Points**: 
  - Managing technical complexity
  - Scaling with increasing usage
  - Maintaining plugin ecosystem

## User Experience Goals

### For Curators
- Simple submission process via Twitter
- Clear feedback on submission status
- Recognition for valuable contributions
- Leaderboard visibility for active curators

### For Moderators
- Efficient moderation workflow
- Clear submission context for decision-making
- Tools to maintain content quality
- Ability to provide feedback to curators

### For Consumers
- Consistent, well-formatted content
- Multiple access channels (Telegram, RSS, etc.)
- Regular content updates
- Content categorization by topic

### For Administrators
- Comprehensive monitoring tools
- Easy configuration management
- Plugin management interface
- Performance analytics

## Content Flow

1. **Submission**: Curators submit content by mentioning or replying to tweets with specific hashtags
2. **Moderation**: Feed moderators approve or reject submissions via Twitter interactions
3. **Processing**: Approved content undergoes transformation based on feed configuration
4. **Distribution**: Processed content is distributed to configured channels
5. **Consumption**: End users consume content through their preferred channels

## Feed Types

### Technology Feeds
- Blockchain updates
- Developer tools
- AI advancements
- Web3 projects

### Community Feeds
- Event announcements
- Governance discussions
- Community initiatives
- Educational content

### Grant Feeds
- Funding opportunities
- Grant announcements
- Project updates
- Application deadlines

## Distribution Channels

### Telegram
- Real-time updates
- Community engagement
- Mobile-friendly format
- Support for rich media

### RSS Feeds
- Standard format for readers
- Integration with news aggregators
- Regular update schedule
- Structured content

### Notion Databases
- Organized knowledge base
- Searchable content repository
- Collaborative environment
- Rich formatting options

### NEAR Social
- Web3 native distribution
- Decentralized content storage
- Community engagement
- On-chain verification

## Content Transformation

### Simple Transformations
- Text formatting
- Link extraction
- Hashtag processing
- Mention handling

### AI Transformations
- Content summarization
- Key point extraction
- Category classification
- Sentiment analysis

### Object Transformations
- JSON structure conversion
- Data field mapping
- Schema validation
- Format standardization

## Moderation System

### Submission Flow
1. Curator mentions or replies to a tweet with specific hashtag
2. System identifies submission and extracts content
3. Submission is linked to appropriate feed(s)
4. Moderators are notified of pending submissions

### Moderation Flow
1. Moderator reviews submission content
2. Moderator approves or rejects via Twitter interaction
3. System updates submission status
4. Approved content enters processing pipeline

### Moderation Criteria
- Relevance to feed topic
- Content quality and value
- Trustworthiness of source
- Community guidelines compliance

## Plugin System

### Plugin Types
- **Transformer Plugins**: Modify content before distribution
- **Distributor Plugins**: Send content to specific channels
- **Source Plugins**: Gather content from various sources

### Plugin Configuration
- Per-feed plugin settings
- Global default configurations
- Plugin-specific parameters
- Authentication credentials

## Recap System

### Recap Types
- Daily summaries
- Weekly roundups
- Monthly highlights
- Custom interval recaps

### Recap Configuration
- Schedule settings (cron expressions)
- Content selection criteria
- Formatting options
- Distribution channels

## Refactoring Impact on Product

The planned refactoring will improve the product in several ways:

1. **Enhanced Reliability**: More robust error handling and consistent patterns will reduce system failures
2. **Faster Feature Development**: Standardized architecture will make adding new features easier
3. **Improved Plugin Ecosystem**: Better plugin system will enable more integrations
4. **Better Testing**: Enhanced testability will reduce bugs and improve quality
5. **Easier Maintenance**: Cleaner code organization will simplify troubleshooting
6. **Scalability**: Improved architecture will better handle increased usage
7. **Developer Experience**: Standardized patterns will improve onboarding for new developers

These improvements will be largely invisible to end users but will result in a more stable, feature-rich platform over time.
