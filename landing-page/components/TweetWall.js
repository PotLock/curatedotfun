import React from "react";
import tweetData from "../data/tweets.json";
import { Tweet } from "react-tweet";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";

const TweetWall = () => {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const handleScroll = (event) => {
    const scrollLeft = event.target.scrollLeft;
    const width = event.target.clientWidth;
    const newIndex = Math.round(scrollLeft / width);
    setCurrentIndex(newIndex);
  };

  return (
    <div data-theme="light">
      <div className="hidden md:grid md:grid-cols-3">
        {tweetData.tweetIds.map((tweetId, index) => (
          <div
            key={index}
            className={`p-4 ${index < 6 ? "border-b" : ""} ${
              index % 3 !== 2 ? "border-r" : ""
            } border-[#57606A] `}
            style={{
              height: "500px",
              overflowY: "auto",
              scrollbarWidth: "none",
            }}
          >
            <div className="flex justify-center h-full">
              <ErrorBoundary
                fallback={
                  <div className="p-4 text-gray-500">Failed to load tweet</div>
                }
              >
                <Tweet id={tweetId} />
              </ErrorBoundary>
            </div>
          </div>
        ))}
      </div>
      <div className="md:hidden">
        <div
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          onScroll={handleScroll}
        >
          {tweetData.tweetIds.map((tweetId, index) => (
            <div
              key={index}
              className="mb-4 min-w-full flex-shrink-0 snap-center mx-auto p-4 border-b border-[#57606A]"
              style={{
                height: "500px",
                overflowY: "auto",
                scrollbarWidth: "none",
              }}
            >
              <div className="flex justify-center h-full">
                <ErrorBoundary
                  fallback={
                    <div className="p-4 text-gray-500">
                      Failed to load tweet
                    </div>
                  }
                >
                  <Tweet id={tweetId} className="mx-auto" />
                </ErrorBoundary>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-2 mt-4 mb-6">
          {tweetData.tweetIds.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full ${
                index === currentIndex ? "bg-black" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TweetWall;
