/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

import { createFileRoute } from "@tanstack/react-router";

// Import Routes

import { Route as rootRoute } from "./routes/__root";
import { Route as TestImport } from "./routes/test";
import { Route as SettingsImport } from "./routes/settings";
import { Route as LeaderboardImport } from "./routes/leaderboard";
import { Route as IndexImport } from "./routes/index";
import { Route as FeedIndexImport } from "./routes/feed/index";
import { Route as ExploreIndexImport } from "./routes/explore/index";
import { Route as FeedFeedIdImport } from "./routes/feed/$feedId";
import { Route as ExploreRootImport } from "./routes/explore/_root";

// Create Virtual Routes

const ExploreImport = createFileRoute("/explore")();

// Create/Update Routes

const ExploreRoute = ExploreImport.update({
  id: "/explore",
  path: "/explore",
  getParentRoute: () => rootRoute,
} as any);

const TestRoute = TestImport.update({
  id: "/test",
  path: "/test",
  getParentRoute: () => rootRoute,
} as any);

const SettingsRoute = SettingsImport.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => rootRoute,
} as any);

const LeaderboardRoute = LeaderboardImport.update({
  id: "/leaderboard",
  path: "/leaderboard",
  getParentRoute: () => rootRoute,
} as any);

const IndexRoute = IndexImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRoute,
} as any);

const FeedIndexRoute = FeedIndexImport.update({
  id: "/feed/",
  path: "/feed/",
  getParentRoute: () => rootRoute,
} as any);

const ExploreIndexRoute = ExploreIndexImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => ExploreRoute,
} as any);

const FeedFeedIdRoute = FeedFeedIdImport.update({
  id: "/feed/$feedId",
  path: "/feed/$feedId",
  getParentRoute: () => rootRoute,
} as any);

const ExploreRootRoute = ExploreRootImport.update({
  id: "/_root",
  getParentRoute: () => ExploreRoute,
} as any);

// Populate the FileRoutesByPath interface

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/": {
      id: "/";
      path: "/";
      fullPath: "/";
      preLoaderRoute: typeof IndexImport;
      parentRoute: typeof rootRoute;
    };
    "/leaderboard": {
      id: "/leaderboard";
      path: "/leaderboard";
      fullPath: "/leaderboard";
      preLoaderRoute: typeof LeaderboardImport;
      parentRoute: typeof rootRoute;
    };
    "/settings": {
      id: "/settings";
      path: "/settings";
      fullPath: "/settings";
      preLoaderRoute: typeof SettingsImport;
      parentRoute: typeof rootRoute;
    };
    "/test": {
      id: "/test";
      path: "/test";
      fullPath: "/test";
      preLoaderRoute: typeof TestImport;
      parentRoute: typeof rootRoute;
    };
    "/explore": {
      id: "/explore";
      path: "/explore";
      fullPath: "/explore";
      preLoaderRoute: typeof ExploreImport;
      parentRoute: typeof rootRoute;
    };
    "/explore/_root": {
      id: "/explore/_root";
      path: "/explore";
      fullPath: "/explore";
      preLoaderRoute: typeof ExploreRootImport;
      parentRoute: typeof ExploreRoute;
    };
    "/feed/$feedId": {
      id: "/feed/$feedId";
      path: "/feed/$feedId";
      fullPath: "/feed/$feedId";
      preLoaderRoute: typeof FeedFeedIdImport;
      parentRoute: typeof rootRoute;
    };
    "/explore/": {
      id: "/explore/";
      path: "/";
      fullPath: "/explore/";
      preLoaderRoute: typeof ExploreIndexImport;
      parentRoute: typeof ExploreImport;
    };
    "/feed/": {
      id: "/feed/";
      path: "/feed";
      fullPath: "/feed";
      preLoaderRoute: typeof FeedIndexImport;
      parentRoute: typeof rootRoute;
    };
  }
}

// Create and export the route tree

interface ExploreRouteChildren {
  ExploreRootRoute: typeof ExploreRootRoute;
  ExploreIndexRoute: typeof ExploreIndexRoute;
}

const ExploreRouteChildren: ExploreRouteChildren = {
  ExploreRootRoute: ExploreRootRoute,
  ExploreIndexRoute: ExploreIndexRoute,
};

const ExploreRouteWithChildren =
  ExploreRoute._addFileChildren(ExploreRouteChildren);

export interface FileRoutesByFullPath {
  "/": typeof IndexRoute;
  "/leaderboard": typeof LeaderboardRoute;
  "/settings": typeof SettingsRoute;
  "/test": typeof TestRoute;
  "/explore": typeof ExploreRootRoute;
  "/feed/$feedId": typeof FeedFeedIdRoute;
  "/explore/": typeof ExploreIndexRoute;
  "/feed": typeof FeedIndexRoute;
}

export interface FileRoutesByTo {
  "/": typeof IndexRoute;
  "/leaderboard": typeof LeaderboardRoute;
  "/settings": typeof SettingsRoute;
  "/test": typeof TestRoute;
  "/explore": typeof ExploreIndexRoute;
  "/feed/$feedId": typeof FeedFeedIdRoute;
  "/feed": typeof FeedIndexRoute;
}

export interface FileRoutesById {
  __root__: typeof rootRoute;
  "/": typeof IndexRoute;
  "/leaderboard": typeof LeaderboardRoute;
  "/settings": typeof SettingsRoute;
  "/test": typeof TestRoute;
  "/explore": typeof ExploreRouteWithChildren;
  "/explore/_root": typeof ExploreRootRoute;
  "/feed/$feedId": typeof FeedFeedIdRoute;
  "/explore/": typeof ExploreIndexRoute;
  "/feed/": typeof FeedIndexRoute;
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath;
  fullPaths:
    | "/"
    | "/leaderboard"
    | "/settings"
    | "/test"
    | "/feed/$feedId"
    | "/feed";
  fileRoutesByTo: FileRoutesByTo;
  to: "/" | "/leaderboard" | "/settings" | "/test" | "/feed/$feedId" | "/feed";
  id:
    | "__root__"
    | "/"
    | "/leaderboard"
    | "/settings"
    | "/test"
    | "/feed/$feedId"
    | "/feed/";
  fileRoutesById: FileRoutesById;
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute;
  LeaderboardRoute: typeof LeaderboardRoute;
  SettingsRoute: typeof SettingsRoute;
  TestRoute: typeof TestRoute;
  ExploreRoute: typeof ExploreRouteWithChildren;
  FeedFeedIdRoute: typeof FeedFeedIdRoute;
  FeedIndexRoute: typeof FeedIndexRoute;
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  LeaderboardRoute: LeaderboardRoute,
  SettingsRoute: SettingsRoute,
  TestRoute: TestRoute,
  ExploreRoute: ExploreRouteWithChildren,
  FeedFeedIdRoute: FeedFeedIdRoute,
  FeedIndexRoute: FeedIndexRoute,
};

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>();

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/leaderboard",
        "/settings",
        "/test",
        "/explore",
        "/feed/$feedId",
        "/feed/"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/leaderboard": {
      "filePath": "leaderboard.tsx"
    },
    "/settings": {
      "filePath": "settings.tsx"
    },
    "/test": {
      "filePath": "test.tsx"
    },
    "/explore": {
      "filePath": "explore",
      "children": [
        "/explore/_root",
        "/explore/"
      ]
    },
    "/explore/_root": {
      "filePath": "explore/_root.tsx",
      "parent": "/explore"
    },
    "/feed/$feedId": {
      "filePath": "feed/$feedId.tsx"
    },
    "/explore/": {
      "filePath": "explore/index.tsx",
      "parent": "/explore"
    },
    "/feed/": {
      "filePath": "feed/index.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
