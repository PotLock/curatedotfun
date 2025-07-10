import { useProcessingJobs, useProcessingSteps } from "@/lib/api";
import { ProcessingJob, ProcessingStep } from "@curatedotfun/types";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ProcessingActions } from "./ProcessingActions";
import { ProcessingStepDetails } from "./ProcessingStepDetails";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface ProcessingHistoryProps {
  submissionId: string;
  feedId: string;
}

const jobColumnHelper = createColumnHelper<ProcessingJob>();
const stepColumnHelper = createColumnHelper<ProcessingStep>();

export function ProcessingHistory({
  submissionId,
  feedId,
}: ProcessingHistoryProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<ProcessingStep | null>(null);
  const [isStepDetailsOpen, setIsStepDetailsOpen] = useState(false);

  const {
    data: jobs,
    isLoading: isLoadingJobs,
    isError: isJobsError,
    error: jobsError,
  } = useProcessingJobs(submissionId, feedId);

  const {
    data: steps,
    isLoading: isLoadingSteps,
    isError: isStepsError,
    error: stepsError,
  } = useProcessingSteps(selectedJobId);

  // Job columns
  const jobColumns = [
    jobColumnHelper.accessor("id", {
      header: "Job ID",
      cell: (info) => info.getValue(),
    }),
    jobColumnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        const variant =
          status === "completed"
            ? "secondary"
            : status === "failed"
              ? "destructive"
              : status === "processing"
                ? "default"
                : status === "completed_with_errors"
                  ? "warning"
                  : "outline";
        return <Badge variant={variant}>{status}</Badge>;
      },
    }),
    jobColumnHelper.accessor("startedAt", {
      header: "Started",
      cell: (info) =>
        info.getValue()
          ? format(new Date(info.getValue() as string), "MMM d, yyyy HH:mm:ss")
          : "N/A",
    }),
    jobColumnHelper.accessor("completedAt", {
      header: "Completed",
      cell: (info) =>
        info.getValue()
          ? format(new Date(info.getValue() as string), "MMM d, yyyy HH:mm:ss")
          : "N/A",
    }),
    jobColumnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const job = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedJobId(job.id)}
            >
              View Steps
            </Button>
            <ProcessingActions job={job} />
          </div>
        );
      },
    }),
  ];

  // Step columns
  const stepColumns = [
    stepColumnHelper.accessor("stepOrder", {
      header: "Order",
      cell: (info) => info.getValue(),
    }),
    stepColumnHelper.accessor("type", {
      header: "Type",
      cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
    }),
    stepColumnHelper.accessor("stage", {
      header: "Stage",
      cell: (info) => <Badge variant="outline">{info.getValue()}</Badge>,
    }),
    stepColumnHelper.accessor("pluginName", {
      header: "Plugin",
      cell: (info) => info.getValue(),
    }),
    stepColumnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <Badge
          variant={
            info.getValue() === "success"
              ? "secondary"
              : info.getValue() === "failed"
                ? "destructive"
                : info.getValue() === "processing"
                  ? "default"
                  : "outline"
          }
        >
          {info.getValue()}
        </Badge>
      ),
    }),
    stepColumnHelper.accessor("startedAt", {
      header: "Started",
      cell: (info) =>
        info.getValue()
          ? format(new Date(info.getValue() as string), "HH:mm:ss")
          : "N/A",
    }),
    stepColumnHelper.accessor("completedAt", {
      header: "Completed",
      cell: (info) =>
        info.getValue()
          ? format(new Date(info.getValue() as string), "HH:mm:ss")
          : "N/A",
    }),
    stepColumnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const step = info.row.original;
        const job = jobs?.find((j) => j.id === step.jobId);

        if (!job) {
          return null;
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setSelectedStep(step);
                setIsStepDetailsOpen(true);
              }}
            >
              View Details
            </Button>
            <ProcessingActions job={job} step={step} />
          </div>
        );
      },
    }),
  ];

  const jobsTable = useReactTable({
    data: jobs || [],
    columns: jobColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const stepsTable = useReactTable({
    data: steps || [],
    columns: stepColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoadingJobs) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading processing history...</span>
      </div>
    );
  }

  if (isJobsError) {
    return (
      <div className="p-4 text-destructive">
        Error loading processing history: {jobsError?.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Processing Jobs</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {jobsTable.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {jobsTable.getRowModel().rows?.length ? (
                jobsTable.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={jobColumns.length}
                    className="h-24 text-center"
                  >
                    No processing jobs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedJobId && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium">Processing Steps</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedJobId(null)}
            >
              Close Steps
            </Button>
          </div>

          {isLoadingSteps ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading steps...</span>
            </div>
          ) : isStepsError ? (
            <div className="p-4 text-destructive">
              Error loading steps: {stepsError?.message}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {stepsTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {stepsTable.getRowModel().rows?.length ? (
                    stepsTable.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={stepColumns.length}
                        className="h-24 text-center"
                      >
                        No processing steps found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <ProcessingStepDetails
        step={selectedStep}
        open={isStepDetailsOpen}
        onOpenChange={setIsStepDetailsOpen}
      />
    </div>
  );
}
