import { db } from "../../services/db";
import { HonoApp } from "../../types/app";
import { serviceUnavailable } from "../../utils/error";
import { logger } from "../../utils/logger";

// Create feed routes
const router = HonoApp();

/**
 * Get all feeds
 */
router.get("/", async (c) => {
  const context = c.get("context");
  return c.json(context.configService.getConfig().feeds);
});

/**
 * Get submissions for a specific feed
 */
router.get("/:feedId", async (c) => {
  const context = c.get("context");
  const feedId = c.req.param("feedId");

  const feed = context.configService.getFeedConfig(feedId);
  if (!feed) {
    return c.notFound();
  }

  return c.json(await db.getSubmissionsByFeed(feedId));
});

/**
 * Process approved submissions for a feed
 * Optional query parameter: distributors - comma-separated list of distributor plugins to use
 * Example: /api/feed/solana/process?distributors=@curatedotfun/rss
 */
router.post("/:feedId/process", async (c) => {
  const context = c.get("context");
  const feedId = c.req.param("feedId");
  
  // Get optional distributors filter from query params
  const distributorsParam = c.req.query("distributors");
  let selectedDistributors = distributorsParam ? 
    distributorsParam.split(",").map(d => d.trim()) : 
    null;

  const feed = context.configService.getFeedConfig(feedId);
  if (!feed) {
    return c.notFound();
  }

  // Get approved submissions for this feed
  const submissions = await db.getSubmissionsByFeed(feedId);
  const approvedSubmissions = submissions.filter(
    (sub) => sub.status === "approved",
  );

  if (approvedSubmissions.length === 0) {
    return c.json({ processed: 0 });
  }

  // Process each submission through stream output
  let processed = 0;
  const usedDistributors = new Set<string>();
  if (!context.processorService) {
    throw serviceUnavailable("Processor");
  }

  for (const submission of approvedSubmissions) {
    try {
      if (feed.outputs.stream) {
        // Create a copy of the stream config
        const streamConfig = { ...feed.outputs.stream };
        
        // Track all distributors if no filter is applied
        if (!selectedDistributors && streamConfig.distribute) {
          streamConfig.distribute.forEach(distributor => {
            usedDistributors.add(distributor.plugin);
          });
        }
        // Filter distributors if selectedDistributors is provided
        else if (selectedDistributors && streamConfig.distribute) {
          // Validate that the selected distributors exist in the config
          if (streamConfig.distribute) {
            const availableDistributors = streamConfig.distribute.map(d => d.plugin);
            const invalidDistributors = selectedDistributors.filter(
              d => !availableDistributors.includes(d)
            );
            
            if (invalidDistributors.length > 0) {
              logger.warn(`Invalid distributor(s) specified: ${invalidDistributors.join(', ')}. Available distributors: ${availableDistributors.join(', ')}`);
              
              // Filter out invalid distributors
              selectedDistributors = selectedDistributors.filter(
                d => availableDistributors.includes(d)
              );
              
              if (selectedDistributors.length === 0) {
                logger.warn(`No valid distributors specified. Using all available distributors.`);
                selectedDistributors = null;
              }
            }
          }
          
          // Apply the filter if we have valid distributors
          if (selectedDistributors !== null) {
            const validDistributors = [...selectedDistributors];
            
            streamConfig.distribute = streamConfig.distribute.filter(
              distributor => validDistributors.includes(distributor.plugin)
            );
            
            // Log which distributors we're using
            logger.info(`Processing submission ${submission.tweetId} with selected distributors: ${validDistributors.join(', ')}`);
            
            // Track which distributors are being used
            validDistributors.forEach(d => usedDistributors.add(d));
          }
        }
        
        await context.processorService.process(submission, streamConfig);
        processed++;
      }
    } catch (error) {
      logger.error(`Error processing submission ${submission.tweetId}:`, error);
    }
  }

  return c.json({ 
    processed,
    distributors: Array.from(usedDistributors)
  });
});

export default router;
