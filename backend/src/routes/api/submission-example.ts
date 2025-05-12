import { HonoApp } from '../../types/app';
import { z } from 'zod';
import { validateRequest, getValidatedData } from '../../core/middleware';
import { getAppContext } from '../../core/appContext';
import { NotFoundError } from '../../core/errors';
import { ISubmissionService } from '../../core/services';
import { InsertSubmission, SubmissionStatus } from '../../core/types';

// Create submission example routes to demonstrate the new service layer
const router = HonoApp();

/**
 * Submission schema for validation
 */
const SubmissionSchema = z.object({
  tweetId: z.string(),
  userId: z.string(),
  username: z.string(),
  content: z.string(),
  curatorId: z.string(),
  curatorUsername: z.string(),
  curatorTweetId: z.string(),
  curatorNotes: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
});

/**
 * Create submission schema
 */
const CreateSubmissionSchema = SubmissionSchema;

/**
 * Update submission schema
 */
const UpdateSubmissionSchema = SubmissionSchema.partial();

/**
 * Moderation action schema
 */
const ModerationActionSchema = z.object({
  adminId: z.string(),
  action: z.enum(['approve', 'reject']),
  feedId: z.string(),
  note: z.string().nullable().optional(),
});

/**
 * Get all submissions
 */
router.get('/', async (c) => {
  const context = getAppContext(c);
  const submissionService = context.getService<ISubmissionService>('ISubmissionService');
  
  const submissions = await submissionService.findAll();
  
  return c.json({ submissions });
});

/**
 * Get submissions by feed ID
 */
router.get('/by-feed/:feedId', async (c) => {
  const feedId = c.req.param('feedId');
  const status = c.req.query('status') as SubmissionStatus | undefined;
  
  const context = getAppContext(c);
  const submissionService = context.getService<ISubmissionService>('ISubmissionService');
  
  const submissions = await submissionService.findByFeedId(feedId, status);
  
  return c.json({ submissions });
});

/**
 * Get submissions by user ID
 */
router.get('/by-user/:userId', async (c) => {
  const userId = c.req.param('userId');
  const context = getAppContext(c);
  const submissionService = context.getService<ISubmissionService>('ISubmissionService');
  
  const submissions = await submissionService.findByUserId(userId);
  
  return c.json({ submissions });
});

/**
 * Get submissions by curator ID
 */
router.get('/by-curator/:curatorId', async (c) => {
  const curatorId = c.req.param('curatorId');
  const context = getAppContext(c);
  const submissionService = context.getService<ISubmissionService>('ISubmissionService');
  
  const submissions = await submissionService.findByCuratorId(curatorId);
  
  return c.json({ submissions });
});

/**
 * Get a submission by ID
 */
router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const context = getAppContext(c);
  const submissionService = context.getService<ISubmissionService>('ISubmissionService');
  
  try {
    const submission = await submissionService.findById(id);
    
    if (!submission) {
      return c.json({ error: `Submission with ID '${id}' not found` }, 404 as any);
    }
    
    return c.json(submission);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404 as any);
    }
    throw error;
  }
});

/**
 * Get moderation history for a submission
 */
router.get('/:id/moderation-history', async (c) => {
  const id = c.req.param('id');
  const context = getAppContext(c);
  const submissionService = context.getService<ISubmissionService>('ISubmissionService');
  
  try {
    const submission = await submissionService.findById(id);
    
    if (!submission) {
      return c.json({ error: `Submission with ID '${id}' not found` }, 404 as any);
    }
    
    const moderationHistory = await submissionService.getModerationHistory(id);
    
    return c.json({ moderationHistory });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404 as any);
    }
    throw error;
  }
});

/**
 * Create a new submission
 */
router.post(
  '/',
  validateRequest('body', CreateSubmissionSchema),
  async (c) => {
    const submissionData = getValidatedData(c, 'body') as InsertSubmission;
    const context = getAppContext(c);
    const submissionService = context.getService<ISubmissionService>('ISubmissionService');
    
    const submission = await submissionService.create(submissionData);
    
    return c.json(submission, 201 as any);
  }
);

/**
 * Add a moderation action to a submission
 */
router.post(
  '/:id/moderate',
  validateRequest('body', ModerationActionSchema),
  async (c) => {
    const id = c.req.param('id');
    const moderationData = getValidatedData(c, 'body') as z.infer<typeof ModerationActionSchema>;
    const context = getAppContext(c);
    const submissionService = context.getService<ISubmissionService>('ISubmissionService');
    
    try {
      const submission = await submissionService.findById(id);
      
      if (!submission) {
        return c.json({ error: `Submission with ID '${id}' not found` }, 404 as any);
      }
      
      const moderationAction = await submissionService.saveModerationAction({
        adminId: moderationData.adminId,
        action: moderationData.action,
        feedId: moderationData.feedId,
        note: moderationData.note,
        tweetId: id,
      });
      
      return c.json(moderationAction, 201 as any);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404 as any);
      }
      throw error;
    }
  }
);

/**
 * Get statistics
 */
router.get('/stats/overview', async (c) => {
  const context = getAppContext(c);
  const submissionService = context.getService<ISubmissionService>('ISubmissionService');
  
  const [postsCount, curatorsCount] = await Promise.all([
    submissionService.getPostsCount(),
    submissionService.getCuratorsCount(),
  ]);
  
  return c.json({
    postsCount,
    curatorsCount,
  });
});

export default router;
