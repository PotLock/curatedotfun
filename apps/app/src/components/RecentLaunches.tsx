// Token data type definition
type Token = {
  id: string;
  name: string;
  icon: string;
  price: string;
  priceChange: string;
};

// Sample demo data
const demoTokens: Token[] = [
  {
    id: "1",
    name: "CGWIRE",
    icon: "🔲",
    price: "$0.06712",
    priceChange: "+31.79%",
  },
  {
    id: "2",
    name: "NEARW",
    icon: "🐻",
    price: "$0.06712",
    priceChange: "+31.79%",
  },
  {
    id: "3",
    name: "NOUNS",
    icon: "👓",
    price: "$0.06712",
    priceChange: "+31.79%",
  },
  {
    id: "4",
    name: "CELO",
    icon: "🔶",
    price: "$0.06712",
    priceChange: "+31.79%",
  },
  {
    id: "5",
    name: "ReFID",
    icon: "🔵",
    price: "$0.06712",
    priceChange: "+31.79%",
  },
  {
    id: "6",
    name: "ELIZA",
    icon: "🟦",
    price: "$0.06712",
    priceChange: "+31.79%",
  },
];

// Arrow up icon component
const ArrowUpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="mr-1"
  >
    <line x1="7" y1="17" x2="17" y2="7"></line>
    <polyline points="7 7 17 7 17 17"></polyline>
  </svg>
);

const TokenCard = ({ token }: { token: Token }) => {
  return (
    <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer">
      <div className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded">
        <span className="text-lg w-11 h-11">{token.icon}</span>
      </div>
      <div className="flex-1">
        <div className="font-medium text-sm">{token.name}</div>
        <div className="text-xs text-gray-600">{token.price}</div>
      </div>
      <div className="text-green-500  text-xs font-medium flex items-center">
        <ArrowUpIcon />
        {token.priceChange}
      </div>
    </div>
  );
};

const RecentTokenLaunches = () => {
  // In a real implementation, you would fetch data from an API

  // Uncomment and modify this to use with your actual API
  // useEffect(() => {
  //   const fetchTokens = async () => {
  //     try {
  //       const response = await fetch('https://your-api-endpoint.com/tokens');
  //       const data = await response.json();
  //       setTokens(data);
  //     } catch (error) {
  //       console.error('Error fetching token data:', error);
  //       // Keep demo data as fallback
  //     }
  //   };
  //   fetchTokens();
  // }, []);

  return (
    <div className="w-full mx-auto p-4 gap-6 flex flex-col">
      <h2 className="text-2xl  leading-10 ">Recent Token Launches</h2>
      <div className="flex flex-wrap md:flex-nowrap space-x-0 bg-gray-50 md:space-x-3 space-y-3 md:space-y-0">
        {demoTokens.map((token, index) => (
          <div
            key={token.id}
            className={`w-full md:w-1/6 ${index > 0 ? "mt-3 md:mt-0" : ""}`}
          >
            <TokenCard token={token} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTokenLaunches;
