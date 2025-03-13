/**
 * Sanitizes JSON data to prevent parsing issues
 * - Handles potential double serialization
 * - Removes BOM characters
 * - Ensures consistent object structure
 */
export function sanitizeJson(data: any): any {
  // Handle different input types
  if (typeof data === 'string') {
    try {
      // Try to parse if it's a string that might be JSON
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        // Remove BOM if present
        const cleanString = data.replace(/^\uFEFF/, '');
        // Parse and re-stringify to normalize
        return JSON.parse(cleanString);
      }
      return data;
    } catch (e) {
      // If parsing fails, return the original string
      return data;
    }
  } else if (Array.isArray(data)) {
    // Process array elements recursively
    return data.map(item => sanitizeJson(item));
  } else if (data !== null && typeof data === 'object') {
    // Process object properties recursively
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeJson(value);
    }
    return result;
  }
  
  // Return primitives as-is
  return data;
}
