# Project Brief: curate.fun

## Overview
curate.fun is a content curation platform that aggregates and distributes curated content across various blockchain and technology domains. The platform uses Twitter as its primary content source and leverages a network of trusted curators for content moderation. It transforms and distributes content to multiple channels including Telegram, RSS feeds, Notion databases, and NEAR Social.

## Core Requirements

### Content Aggregation
- Monitor Twitter for content submissions
- Support multiple content feeds (grants, ethereum, near, solana, ai, etc.)
- Enable trusted curator moderation system
- Track submission status and history

### Content Distribution
- Plugin-based distribution system supporting:
  - Telegram channels
  - RSS feeds
  - Notion databases
  - NEAR Social
  - Other extensible outputs
- Support for both stream and recap distribution modes

### Content Transformation
- Support content transformation before distribution
- Enable both simple and AI-powered transformations
- Support custom formatting per feed
- Object mapping and transformation capabilities
- Curator note integration

### Moderation
- Twitter-based approver system
- Per-feed moderator lists
- Submission status tracking
- Approval workflow via Twitter interactions

### Platform Management
- Configuration-driven feed management
- Admin interface for monitoring and management
- Plugin system for extensibility
- Performance monitoring and analytics

## Goals
1. Create a reliable content curation infrastructure
2. Enable easy content distribution across multiple platforms
3. Maintain high content quality through trusted curator network
4. Support extensible plugin system for future integrations
5. Provide consistent, well-formatted content to consumers
6. Enhance content with AI-powered transformations

## Technical Requirements
- High reliability and uptime
- Scalable architecture
- Plugin extensibility through module federation
- Secure moderation system
- Real-time content processing
- Efficient resource usage
- Comprehensive error handling
- Graceful degradation
- Containerized deployment with Docker
- PostgreSQL database with proper security measures

## Current Status
The platform is fully operational with:
- Multiple active feeds across various domains
- Established curator networks
- Multiple distribution channels
- AI-powered content transformation
- Comprehensive plugin system
- Containerized deployment on Railway
