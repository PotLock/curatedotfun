import { Button } from "../../ui/button";

export function CurateCTA() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between rounded-lg border border-neutral-300 bg-blue-50 p-4 sm:h-[88px] gap-4 sm:gap-0">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <img
          src="/images/curate-coins.png"
          className="object-cover w-16 h-16 sm:size-[74px] sm:ms-[14px]"
        />
        <div className="flex flex-col text-sm sm:text-base">
          <h5 className="font-bold">No Problem.</h5>
          <p className="text-xs sm:text-sm">
            Getting CURATE is easier than ever with _______. Get your tokens in
            minutes.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-2.5 sm:me-[38px]">
        <Button
          variant="outline-button"
          className="text-xs sm:text-sm py-1 px-3 sm:py-2 sm:px-4"
        >
          Swap
        </Button>
        <Button
          variant="filled"
          className="text-xs sm:text-sm py-1 px-3 sm:py-2 sm:px-4"
        >
          Get $CURATE
        </Button>
      </div>
    </div>
  );
}
