import { useAuth } from "../../contexts/AuthContext";

export function ProfileHeader() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col md:flex-row w-full items-center gap-6 md:gap-10 p-4 md:p-6 border border-neutral-300 rounded-md light">
      <img
        className="size-24 md:size-28 rounded-full shrink-0 mx-auto md:mx-0"
        // src={userInfo?.profileImage} // Use user.profileImage (hypothetical) or a default
        // For now, if user.profileImage doesn't exist, this might break or show nothing.
        // A placeholder or default image logic would be better here.
        // Example: src={user?.profileImage || '/default-avatar.png'}
        alt={user?.username || "User Avatar"} // Add alt text
      />
      <div className="flex flex-col gap-2.5 items-center md:items-start text-center md:text-left">
        <div className="flex flex-col space-y-4">
          <h2 className="text-lg md:text-2xl capitalize">{user?.username}</h2>
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <img
              className="size-5 md:size-6 rounded-lg"
              src="/images/near.png"
            />
            <p className="text-sm md:text-base font-normal text-[#64748B]">
              {user?.near_account_id}
            </p>
          </div>
        </div>
        {/* <p className="text-[#262626] max-w-[610px] text-sm md:text-base">
          Daily updates on crypto and blockchain grants, funding opportunities
          and ecosystem development.
        </p>
        <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
          <a
            href="#"
            target="_blank"
            className="h-[26px] font-[Geist] border rounded-md py-0.5 px-2.5 bg-[#F5F5F5] border-[#262626] text-black text-xs font-medium flex items-center justify-center gap-1 hover:bg-black/10 transition-all duration-300 ease-in-out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
            >
              <path
                d="M7.89939 9.72902L4.25695 13.8729H2.68692L7.19921 8.70156L7.29333 8.59369L7.2064 8.47993L2.38818 2.17525H6.17681L9.04256 5.96119L9.17297 6.13348L9.31463 5.9703L12.6089 2.17525H14.1793L9.9871 6.99883L9.89382 7.10615L9.97962 7.21954L15.0146 13.8729H11.3305L8.17025 9.73829L8.04047 9.5685L7.89939 9.72902ZM11.6669 12.923L11.7195 12.9918H11.8061H12.9306H13.2821L13.0706 12.7111L5.78811 3.04581L5.73553 2.97603H5.64815H4.41656H4.06198L4.27734 3.25771L11.6669 12.923Z"
                fill="#020617"
                stroke="black"
                stroke-width="0.350493"
              />
            </svg>
            @plungrel
          </a>
          <a
            href="#"
            target="_blank"
            className="h-[26px] font-[Geist] border rounded-md py-0.5 px-2.5 bg-[#F5F5F5] border-[#262626] text-black text-xs font-medium flex items-center justify-center gap-1 hover:bg-black/10 transition-all duration-300 ease-in-out"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
            >
              <path
                d="M11.4671 5.33301C12.528 5.33301 13.5454 5.75444 14.2956 6.50458C15.0457 7.25473 15.4671 8.27214 15.4671 9.33301V13.9997H12.8005V9.33301C12.8005 8.97939 12.66 8.64025 12.4099 8.3902C12.1599 8.14015 11.8207 7.99967 11.4671 7.99967C11.1135 7.99967 10.7744 8.14015 10.5243 8.3902C10.2743 8.64025 10.1338 8.97939 10.1338 9.33301V13.9997H7.46712V9.33301C7.46712 8.27214 7.88855 7.25473 8.6387 6.50458C9.38884 5.75444 10.4063 5.33301 11.4671 5.33301Z"
                stroke="black"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M4.80046 5.99967H2.13379V13.9997H4.80046V5.99967Z"
                stroke="black"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M3.46712 3.99967C4.2035 3.99967 4.80046 3.40272 4.80046 2.66634C4.80046 1.92996 4.2035 1.33301 3.46712 1.33301C2.73074 1.33301 2.13379 1.92996 2.13379 2.66634C2.13379 3.40272 2.73074 3.99967 3.46712 3.99967Z"
                stroke="black"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            /web3.plungrel
          </a>
        </div> */}
      </div>
    </div>
  );
}
