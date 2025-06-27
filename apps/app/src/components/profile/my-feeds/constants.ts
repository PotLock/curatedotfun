export const filterOptions = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "completed",
    label: "Completed",
  },
  {
    value: "incomplete",
    label: "Setup incomplete",
  },
] as const;

export type FilterValue = typeof filterOptions[number]["value"];