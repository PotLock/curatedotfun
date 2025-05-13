import fs from 'fs/promises';
import path from 'path';
import { zodToJsonSchema } from "zod-to-json-schema";
import { profileSchema } from '../src/types/zod/userProfile';

const schemasToGenerate = [
  {
    // Filename will be userProfile.v1.schema.json
    // The URL in metadata.type will be /schemas/userProfile.v1.schema.json
    id: 'userProfile.v1',
    schema: profileSchema,
  },
  // Add more schemas here as your application grows
];

// Output directory within the frontend's public assets
const outputDir = path.resolve(__dirname, '../public/schemas');

async function generateSchemas() {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Ensured schema directory exists: ${outputDir}`);

    for (const item of schemasToGenerate) {
      const jsonSchema = zodToJsonSchema(item.schema, item.id);
      const outputPath = path.join(outputDir, `${item.id}.schema.json`);
      await fs.writeFile(outputPath, JSON.stringify(jsonSchema, null, 2));
      console.log(`Generated JSON schema: ${outputPath}`);
      console.log(`  Accessible at public URL: /schemas/${item.id}.schema.json`);
    }
    console.log('JSON schema generation complete.');
  } catch (error) {
    console.error('Error generating JSON schemas:', error);
    process.exit(1);
  }
}

generateSchemas();
