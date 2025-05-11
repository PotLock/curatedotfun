import { HonoApp } from '../../types/app';
import { z } from 'zod';
import { validateRequest, getValidatedData } from '../../core/middleware';
import { getAppContext } from '../../core/appContext';
import { NotFoundError } from '../../core/errors';

// Create example routes to demonstrate the new validation middleware
const router = HonoApp();

/**
 * Example schema for a user
 */
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).optional(),
  role: z.enum(['admin', 'user', 'guest']).default('user'),
});

type User = z.infer<typeof UserSchema>;

/**
 * Example schema for creating a user
 */
const CreateUserSchema = UserSchema.omit({ id: true });

/**
 * Example schema for updating a user
 */
const UpdateUserSchema = CreateUserSchema.partial();

/**
 * Example query parameters schema
 */
const UserQuerySchema = z.object({
  role: z.enum(['admin', 'user', 'guest']).optional(),
  sortBy: z.enum(['name', 'email', 'age']).optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

// Mock users data
const users: User[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    role: 'admin',
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    name: 'Jane Smith',
    email: 'jane@example.com',
    age: 25,
    role: 'user',
  },
];

/**
 * Get all users with optional filtering
 */
router.get(
  '/',
  validateRequest('query', UserQuerySchema),
  (c) => {
    const query = getValidatedData<z.infer<typeof UserQuerySchema>>(c, 'query');
    
    // Filter users by role if provided
    let filteredUsers = users;
    if (query.role) {
      filteredUsers = users.filter(user => user.role === query.role);
    }
    
    // Sort users
    filteredUsers.sort((a, b) => {
      const aValue = a[query.sortBy as keyof User];
      const bValue = b[query.sortBy as keyof User];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return query.order === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return query.order === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
    
    return c.json({ users: filteredUsers });
  }
);

/**
 * Get a user by ID
 */
router.get('/:id', (c) => {
  const id = c.req.param('id');
  const user = users.find(u => u.id === id);
  
  if (!user) {
    throw new NotFoundError('User', id);
  }
  
  return c.json(user);
});

/**
 * Create a new user
 */
router.post(
  '/',
  validateRequest('body', CreateUserSchema),
  (c) => {
    const userData = getValidatedData<z.infer<typeof CreateUserSchema>>(c, 'body');
    
    // Generate a new ID
    const newUser: User = {
      ...userData,
      id: crypto.randomUUID(),
    };
    
    // In a real app, we would save to a database
    users.push(newUser);
    
    return c.json(newUser, 201 as any);
  }
);

/**
 * Update a user
 */
router.patch(
  '/:id',
  validateRequest('body', UpdateUserSchema),
  (c) => {
    const id = c.req.param('id');
    const userData = getValidatedData<z.infer<typeof UpdateUserSchema>>(c, 'body');
    
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      throw new NotFoundError('User', id);
    }
    
    // Update user data
    users[userIndex] = {
      ...users[userIndex],
      ...userData,
    };
    
    return c.json(users[userIndex]);
  }
);

/**
 * Delete a user
 */
router.delete('/:id', (c) => {
  const id = c.req.param('id');
  const userIndex = users.findIndex(u => u.id === id);
  
  if (userIndex === -1) {
    throw new NotFoundError('User', id);
  }
  
  // Remove user
  const deletedUser = users.splice(userIndex, 1)[0];
  
  return c.json({ 
    message: `User ${deletedUser.name} deleted successfully`,
    id 
  });
});

/**
 * Example of using the enhanced app context
 */
router.get('/context/example', (c) => {
  const context = getAppContext(c);
  
  // Check if a service is available
  const hasConfigService = context.hasService('ConfigService');
  
  // Get service from the container
  if (hasConfigService) {
    const configService = context.getService<any>('ConfigService');
    const config = configService.getConfig();
    
    return c.json({
      message: 'Using enhanced app context',
      hasConfigService,
      configAvailable: !!config,
    });
  }
  
  return c.json({
    message: 'Using enhanced app context',
    hasConfigService,
  });
});

export default router;
