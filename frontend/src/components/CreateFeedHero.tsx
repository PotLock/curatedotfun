export default function CreateFeedHero() {
  // Import as a static asset

  return (
    <div
      className="flex flex-col items-center justify-center py-20 gap-2 border w-full"
      style={{
        backgroundImage: 'url("/grid.png")',
        backgroundRepeat: "repeat",
        backgroundSize: "auto",
        backgroundPosition: "center",
      }}
    >
      <h1 className="md:text-5xl text-2xl text-center font-bold">
        Create your own autonomous brand.
      </h1>
      <p className="md:max-w-[766px] md:text-2xl text-lg text-center font-normal leading-8">
        Set up your own feed on Twitter, Farcaster and other platforms with
        automated curation and distribution.
      </p>
    </div>
  );
}
