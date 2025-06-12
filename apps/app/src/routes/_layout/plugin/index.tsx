import { createFileRoute, Link } from "@tanstack/react-router";
import { useAllPlugins } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";

export const Route = createFileRoute("/_layout/plugin/")({
  component: PluginIndexPage,
});

function PluginIndexPage() {
  const { data: plugins, isLoading, error } = useAllPlugins();

  if (isLoading) return <div>Loading plugins...</div>;
  if (error) return <div>Error loading plugins: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Plugins</h1>
        <Button asChild>
          <Link to="/create/plugin">Create New Plugin</Link>
        </Button>
      </div>
      {plugins && plugins.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Repository</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plugins.map((plugin) => (
              <TableRow key={plugin.id}>
                <TableCell className="font-medium">{plugin.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{plugin.type}</Badge>
                </TableCell>
                <TableCell>
                  <a
                    href={plugin.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {plugin.repoUrl}
                  </a>
                </TableCell>
                <TableCell>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to="/plugin/$pluginId"
                      params={{ pluginId: plugin.id }}
                    >
                      View/Edit
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p>No plugins found.</p>
      )}
    </div>
  );
}
