import { HonoApp } from '../../types/app';
import { z } from 'zod';
import { validateRequest, getValidatedData } from '../../core/middleware';
import { getAppContext } from '../../core/appContext';
import { NotFoundError } from '../../core/errors';
import { IFeedService } from '../../core/services';
import { InsertFeed } from '../../core/types';

// Create feed example routes to demonstrate the new service layer
const router = HonoApp();

/**
 * Feed schema for validation
 */
const FeedSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(100),
  description: z.string().nullable().optional(),
  config: z.any(),
});

/**
 * Create feed schema
 */
const CreateFeedSchema = FeedSchema;

/**
 * Update feed schema
 */
const UpdateFeedSchema = FeedSchema.partial();

/**
 * Get all feeds
 */
router.get('/', async (c) => {
  const context = getAppContext(c);
  const feedService = context.getService<IFeedService>('IFeedService');
  
  const feeds = await feedService.findAll();
  
  return c.json({ feeds });
});

/**
 * Get feeds with submission counts
 */
router.get('/with-counts', async (c) => {
  const context = getAppContext(c);
  const feedService = context.getService<IFeedService>('IFeedService');
  
  const feeds = await feedService.findWithSubmissionCounts();
  
  return c.json({ feeds });
});

/**
 * Get a feed by ID
 */
router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const context = getAppContext(c);
  const feedService = context.getService<IFeedService>('IFeedService');
  
  try {
    const feed = await feedService.findByIdOrThrow(id);
    return c.json(feed);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404 as any);
    }
    throw error;
  }
});

/**
 * Create a new feed
 */
router.post(
  '/',
  validateRequest('body', CreateFeedSchema),
  async (c) => {
    const feedData = getValidatedData(c, 'body') as InsertFeed;
    const context = getAppContext(c);
    const feedService = context.getService<IFeedService>('IFeedService');
    
    const feed = await feedService.create(feedData);
    
    return c.json(feed, 201 as any);
  }
);

/**
 * Update a feed
 */
router.patch(
  '/:id',
  validateRequest('body', UpdateFeedSchema),
  async (c) => {
    const id = c.req.param('id');
    const feedData = getValidatedData(c, 'body') as Partial<InsertFeed>;
    const context = getAppContext(c);
    const feedService = context.getService<IFeedService>('IFeedService');
    
    try {
      const feed = await feedService.update(id, feedData);
      return c.json(feed);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404 as any);
      }
      throw error;
    }
  }
);

/**
 * Delete a feed
 */
router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const context = getAppContext(c);
  const feedService = context.getService<IFeedService>('IFeedService');
  
  try {
    const feed = await feedService.delete(id);
    return c.json({ 
      message: `Feed ${feed.name} deleted successfully`,
      id 
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404 as any);
    }
    throw error;
  }
});

export default router;
