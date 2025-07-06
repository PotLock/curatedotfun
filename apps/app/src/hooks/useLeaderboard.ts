import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { debounce } from "lodash-es";
import {
  SortingState,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import { LeaderboardEntry, useAllFeeds } from "../lib/api";
import { createLeaderboardColumns } from "../components/leaderboard/LeaderboardColumns";

interface LeaderboardSearch {
  feed: string;
  timeframe: string;
}

export function useLeaderboard(
  leaderboard: LeaderboardEntry[],
  search: LeaderboardSearch,
) {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<
    string | null
  >(null);
  const [showFeedDropdown, setShowFeedDropdown] = useState<boolean>(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState<boolean>(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { data: allFeeds = [] } = useAllFeeds();
  const feedDropdownRef = useRef<HTMLDivElement>(null);
  const timeDropdownRef = useRef<HTMLDivElement>(null);

  const debouncedSetDebouncedSearchQuery = useRef(
    debounce((query) => setDebouncedSearchQuery(query), 300),
  ).current;

  const timeOptions = [
    { label: "All Time", value: "all" },
    { label: "This Month", value: "month" },
    { label: "This Week", value: "week" },
    { label: "Today", value: "today" },
  ];

  const feeds = useMemo(() => {
    return [
      {
        label: "All Feeds",
        value: "all feeds",
      },
      ...(
        allFeeds.map((feed) => ({
          label: feed.name,
          value: feed.id,
        })) || []
      ).filter((feed) => feed.value !== "all"),
    ];
  }, [allFeeds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        feedDropdownRef.current &&
        !feedDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFeedDropdown(false);
      }
      if (
        timeDropdownRef.current &&
        !timeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTimeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce search query
  useEffect(() => {
    debouncedSetDebouncedSearchQuery(searchQuery);
    return () => {
      debouncedSetDebouncedSearchQuery.cancel();
    };
  }, [searchQuery]);

  const toggleRow = useCallback((index: number) => {
    setExpandedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }, []);

  const collapseAllRows = useCallback(() => {
    setExpandedRows([]);
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleFeedDropdownToggle = useCallback(() => {
    setShowFeedDropdown((prev) => !prev);
  }, []);

  const handleTimeDropdownToggle = useCallback(() => {
    setShowTimeDropdown((prev) => !prev);
  }, []);

  const handleFeedDropdownClose = useCallback(() => {
    setShowFeedDropdown(false);
  }, []);

  const handleTimeDropdownClose = useCallback(() => {
    setShowTimeDropdown(false);
  }, []);

  const filteredLeaderboard = useMemo(() => {
    return leaderboard?.filter((item) => {
      const searchTerm = debouncedSearchQuery?.toLowerCase();
      const feedFilter =
        search.feed === "all feeds"
          ? true
          : item.feedSubmissions?.some((feed) => feed.feedId === search.feed);

      const matchesSearch =
        !searchTerm ||
        item.curatorUsername?.toLowerCase().includes(searchTerm) ||
        item.feedSubmissions?.some((feed) =>
          feed.feedId?.toLowerCase().includes(searchTerm),
        );

      return feedFilter && matchesSearch;
    });
  }, [leaderboard, debouncedSearchQuery, search.feed]);

  const filteredLeaderboardWithRanks = useMemo(() => {
    return filteredLeaderboard?.map((item) => {
      const originalIndex = leaderboard?.findIndex(
        (entry) => entry.curatorId === item.curatorId,
      );
      return {
        ...item,
        originalRank: originalIndex !== undefined ? originalIndex + 1 : 0,
      };
    });
  }, [filteredLeaderboard, leaderboard]);

  const expandAllRows = useCallback(() => {
    if (!filteredLeaderboardWithRanks) return;
    const allRowIndices = Array.from(
      { length: filteredLeaderboardWithRanks.length },
      (_, i) => i,
    );
    setExpandedRows(allRowIndices);
  }, [filteredLeaderboardWithRanks]);

  const columns = useMemo(() => {
    return createLeaderboardColumns(expandedRows, toggleRow);
  }, [expandedRows, toggleRow]);

  const table = useReactTable({
    data: filteredLeaderboardWithRanks || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return {
    // State
    searchQuery,
    showFeedDropdown,
    showTimeDropdown,
    feeds,
    timeOptions,
    expandedRows,

    // Handlers
    handleSearch,
    handleFeedDropdownToggle,
    handleTimeDropdownToggle,
    handleFeedDropdownClose,
    handleTimeDropdownClose,
    expandAllRows,
    collapseAllRows,

    // Refs
    feedDropdownRef,
    timeDropdownRef,

    // Table
    table,
    hasData: Boolean(leaderboard && leaderboard.length > 0),
  };
}
