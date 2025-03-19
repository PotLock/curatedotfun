import { execSync } from "child_process";
import { join } from "path";

export default async () => {
  console.time("global-teardown");

  // Stop and remove the PostgreSQL container
  try {
    const dockerComposePath = join(__dirname, "docker-compose.yml");

    // Only stop the container in CI environment to keep it running for local debugging
    if (process.env.CI) {
      console.log("Stopping PostgreSQL container...");
      execSync(`docker-compose -f ${dockerComposePath} down -v`, {
        stdio: "inherit",
      });
      console.log("PostgreSQL container stopped and removed");
    } else {
      console.log("Skipping PostgreSQL container cleanup in local environment");
      console.log(
        "To stop the container manually, run: docker-compose -f backend/test/setup/docker-compose.yml down -v",
      );
    }
  } catch (error) {
    console.error("Error during teardown:", error);
  }

  console.timeEnd("global-teardown");
};
