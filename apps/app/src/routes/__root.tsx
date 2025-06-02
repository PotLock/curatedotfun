import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import React from "react";
import { Toaster } from "../components/ui/toaster";
import { AuthModals } from "../components/AuthModals";
import { Scripts } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { TRPCRouter } from "@/integrations/trpc/router";

import appCss from "@/styles/app.css?url"

interface RouterContext {
  queryClient: QueryClient;

  // trpc: TRPCOptionsProxy<TRPCRouter>;
}

export const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : React.lazy(() =>
        import("@tanstack/react-router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      );

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: "UTF-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      },
      {
        title: "curate.fun - crowdsource automated content",
      },
      {
        name: "description",
        content: "Save hours of content curation time with AI-powered tools that transform social media content into professional feeds, newsletters, and podcasts. Trusted by leading Web3 curators.",
      },
      {
        name: "keywords",
        content: "content curation, social media automation, AI content management, digital publishing, content transformation",
      },
      {
        property: "og:title",
        content: "CURATE.FUN - Curate News on Socials",
      },
      {
        property: "og:description",
        content: "Curate news directly on socials and turn feeds into regular content.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: "https://app.curate.fun",
      },
      {
        property: "og:image",
        content: "https://curate.fun/meta.png",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "CURATE.FUN - Curate News on Socials",
      },
      {
        name: "twitter:description",
        content: "Curate news directly on socials and turn feeds into regular content.",
      },
      {
        property: "twitter:image",
        content: "https://curate.fun/meta.png",
      },
      {
        name: "theme-color",
        content: "#ffffff",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "mobile-web-app-capable",
        content: "yes",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: () => (
    <RootDocument>
      <Outlet />
      <TanStackRouterDevtools />

      <Toaster />
      {/* <TanStackQueryLayout /> */}
    </RootDocument>
  ),
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script src="https://unpkg.com/fastintear@latest/dist/umd/browser.global.js" />
      </head>
      <body>
        <div id="root">
          {children}
        </div>
        <Scripts />
      </body>
    </html>
  );
}
