import { useState } from "react";
import {
  useRecaps,
  useAddRecap,
  useUpdateRecap,
  useDeleteRecap,
  useRunRecap,
  RecapWithState,
} from "../lib/recap";
import { RecapConfig } from "../types/recap";

interface RecapManagerProps {
  feedId: string;
}

export default function RecapManager({ feedId }: RecapManagerProps) {
  const { data: recapsData, isLoading, error } = useRecaps(feedId);
  const [isAddingRecap, setIsAddingRecap] = useState(false);
  const [editingRecapIndex, setEditingRecapIndex] = useState<number | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Default empty recap config
  const emptyRecapConfig: RecapConfig = {
    name: "",
    enabled: true,
    schedule: "0 0 * * *", // Daily at midnight
    timezone: "UTC",
    transform: [],
    distribute: [],
  };

  // Form state
  const [recapForm, setRecapForm] = useState<RecapConfig>(emptyRecapConfig);

  // Mutations
  const addRecap = useAddRecap(feedId);
  const updateRecap = useUpdateRecap(
    feedId,
    editingRecapIndex !== null ? editingRecapIndex : 0,
  );
  const deleteRecap = useDeleteRecap(
    feedId,
    editingRecapIndex !== null ? editingRecapIndex : 0,
  );
  const runRecap = useRunRecap(
    feedId,
    editingRecapIndex !== null ? editingRecapIndex : 0,
  );

  // Start adding a new recap
  const handleAddRecap = () => {
    setRecapForm(emptyRecapConfig);
    setIsAddingRecap(true);
    setEditingRecapIndex(null);
    setFormError(null);
    setFormSuccess(null);
  };

  // Start editing an existing recap
  const handleEditRecap = (recap: RecapWithState, index: number) => {
    setRecapForm({
      name: recap.name,
      enabled: recap.enabled,
      schedule: recap.schedule,
      timezone: recap.timezone,
      transform: recap.transform || [],
      batchTransform: recap.batchTransform || [],
      distribute: recap.distribute || [],
    });
    setIsAddingRecap(false);
    setEditingRecapIndex(index);
    setFormError(null);
    setFormSuccess(null);
  };

  // Cancel form
  const handleCancelForm = () => {
    setIsAddingRecap(false);
    setEditingRecapIndex(null);
    setFormError(null);
    setFormSuccess(null);
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;

    setRecapForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Submit form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      if (isAddingRecap) {
        await addRecap.mutateAsync(recapForm);
        setFormSuccess("Recap configuration added successfully!");
        setIsAddingRecap(false);
      } else if (editingRecapIndex !== null) {
        await updateRecap.mutateAsync(recapForm);
        setFormSuccess("Recap configuration updated successfully!");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Delete a recap
  const handleDeleteRecap = async (index: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this recap configuration?",
      )
    ) {
      return;
    }

    setFormError(null);
    setFormSuccess(null);
    setEditingRecapIndex(index);

    try {
      await deleteRecap.mutateAsync();
      setFormSuccess("Recap configuration deleted successfully!");
      setEditingRecapIndex(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Run a recap manually
  const handleRunRecap = async (index: number) => {
    setFormError(null);
    setFormSuccess(null);
    setEditingRecapIndex(index);

    try {
      await runRecap.mutateAsync();
      setFormSuccess("Recap job triggered successfully!");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return <div className="p-4">Loading recap configurations...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error:{" "}
        {error instanceof Error
          ? error.message
          : "Failed to load recap configurations"}
      </div>
    );
  }

  const recaps = recapsData?.recaps || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="heading-2">Recap Configurations</h2>
        <button
          onClick={handleAddRecap}
          className="px-3 py-1.5 bg-blue-200 hover:bg-blue-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
        >
          Add Recap
        </button>
      </div>

      {formError && (
        <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded">
          {formError}
        </div>
      )}

      {formSuccess && (
        <div className="bg-green-100 border-2 border-green-400 text-green-700 px-4 py-3 rounded">
          {formSuccess}
        </div>
      )}

      {/* Recap Form */}
      {(isAddingRecap || editingRecapIndex !== null) && (
        <div className="card">
          <h3 className="heading-3 mb-4">
            {isAddingRecap ? "Add New Recap" : "Edit Recap"}
          </h3>
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={recapForm.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none transition-colors"
                placeholder="Daily Recap"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                name="enabled"
                checked={recapForm.enabled}
                onChange={handleInputChange}
                className="h-4 w-4 border-2 border-black focus:outline-none transition-colors"
              />
              <label
                htmlFor="enabled"
                className="ml-2 block text-sm font-medium text-gray-700"
              >
                Enabled
              </label>
            </div>

            <div>
              <label
                htmlFor="schedule"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Schedule
              </label>
              <input
                type="text"
                id="schedule"
                name="schedule"
                value={recapForm.schedule}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none transition-colors"
                placeholder="0 0 * * *"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Cron expression (e.g., "0 0 * * *" for daily at midnight) or
                interval (e.g., "day:1" for daily)
              </p>
            </div>

            <div>
              <label
                htmlFor="timezone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Timezone
              </label>
              <input
                type="text"
                id="timezone"
                name="timezone"
                value={recapForm.timezone || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none transition-colors"
                placeholder="UTC"
              />
              <p className="text-xs text-gray-500 mt-1">
                e.g., "UTC", "America/New_York", "Europe/London"
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-200 hover:bg-blue-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-sm font-medium"
                disabled={addRecap.isPending || updateRecap.isPending}
              >
                {addRecap.isPending || updateRecap.isPending
                  ? "Saving..."
                  : isAddingRecap
                    ? "Add Recap"
                    : "Update Recap"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recap List */}
      {recaps.length === 0 ? (
        <div className="card p-4 text-center text-gray-500">
          No recap configurations found. Click "Add Recap" to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {recaps.map((recap, index) => (
            <div key={index} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="heading-3">{recap.name}</h3>
                  <div className="mt-1 text-sm">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full ${
                        recap.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {recap.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleRunRecap(index)}
                    className="px-2 py-1 bg-green-200 hover:bg-green-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-xs font-medium"
                    disabled={runRecap.isPending && editingRecapIndex === index}
                  >
                    {runRecap.isPending && editingRecapIndex === index
                      ? "Running..."
                      : "Run Now"}
                  </button>
                  <button
                    onClick={() => handleEditRecap(recap, index)}
                    className="px-2 py-1 bg-blue-200 hover:bg-blue-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRecap(index)}
                    className="px-2 py-1 bg-red-200 hover:bg-red-300 text-black rounded-md border-2 border-black shadow-sharp hover:shadow-sharp-hover transition-all duration-200 translate-x-0 translate-y-0 hover:-translate-x-0.5 hover:-translate-y-0.5 text-xs font-medium"
                    disabled={
                      deleteRecap.isPending && editingRecapIndex === index
                    }
                  >
                    {deleteRecap.isPending && editingRecapIndex === index
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="font-semibold">Schedule:</div>
                <div className="font-mono">{recap.schedule}</div>

                <div className="font-semibold">Timezone:</div>
                <div>{recap.timezone || "UTC"}</div>

                <div className="font-semibold">Last Run:</div>
                <div>{formatDate(recap.state?.lastSuccessfulCompletion)}</div>

                {recap.state?.lastRunError && (
                  <>
                    <div className="font-semibold text-red-600">
                      Last Error:
                    </div>
                    <div className="text-red-600">
                      {recap.state.lastRunError}
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4">
                <div className="font-semibold text-sm mb-2">Configuration:</div>
                <div className="bg-gray-50 p-2 rounded text-xs font-mono overflow-auto max-h-40">
                  <pre>
                    {JSON.stringify(
                      {
                        transform: recap.transform,
                        batchTransform: recap.batchTransform,
                        distribute: recap.distribute,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
