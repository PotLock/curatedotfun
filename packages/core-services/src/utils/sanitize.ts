/**
 * Sanitizes JSON data to prevent parsing issues
 * - Handles potential double serialization
 * - Removes BOM characters
 * - Ensures consistent object structure
 */
export function sanitizeJson(data: any): any {
  // Handle different input types
  if (typeof data === "string") {
    try {
      // Remove BOM if present
      let cleanString = data.replace(/^\uFEFF/, "");

      // Try to parse if it's a string that might be JSON
      const trimmed = cleanString.trim();
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        // Check for quoted JSON strings (double stringified)
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        // Parse the string
        const parsed = JSON.parse(cleanString);

        // If the result is still a string that looks like JSON, recursively parse it
        if (typeof parsed === "string") {
          return sanitizeJson(parsed);
        }

        return parsed;
      }
      return data;
    } catch (e) {
      // If parsing fails, return the original string
      return data;
    }
  } else if (Array.isArray(data)) {
    // Process array elements recursively
    return data.map((item) => sanitizeJson(item));
  } else if (data !== null && typeof data === "object") {
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
