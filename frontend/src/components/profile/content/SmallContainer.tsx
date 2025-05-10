import { cn } from "../../../lib/utils";

// Define status type for better type safety
type StatusType = "Approved" | "Pending" | "Rejected";

// Extract types to separate interface definitions
interface UserInfo {
  profileImage: string;
  username: string;
  time: string;
}

interface SmallContainerProps {
  title: string;
  description?: string;
  status: StatusType;
  className?: string;
  moderationNotes?: {
    moderator: string;
    taggedUsers?: string[];
  };
  layout?:
    | "default"
    | "single-row"
    | "profile-inline"
    | "profile-stacked"
    | "special";
  userInfo: UserInfo;
}

// Extract status badge as a separate component
function StatusBadge({ status }: { status: StatusType }) {
  const statusStyles = {
    Approved: "text-green-600 bg-green-100",
    Pending: "text-yellow-600 bg-yellow-100",
    Rejected: "text-red-600 bg-red-100",
  };

  return (
    <div className={`text-xs px-2 py-1 rounded ${statusStyles[status] || ""}`}>
      {status}
    </div>
  );
}

// Extract user profile component
function UserProfile({ profileImage, username, time }: UserInfo) {
  return (
    <div className="flex items-center">
      <img
        className="w-6 h-6 rounded-full mr-2"
        src={profileImage}
        alt={username}
      />
      <span className="text-sm font-medium mr-2">{username}</span>
      <span className="text-xs text-gray-500">{time}</span>
    </div>
  );
}

// Extract moderation notes component
function ModerationNotes({
  moderator,
  taggedUsers = [],
}: NonNullable<SmallContainerProps["moderationNotes"]>) {
  return (
    <div className="mt-auto">
      <div className="bg-gray-100 rounded-md p-3 border border-gray-200">
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Moderation Notes</span>
          <span className="text-xs text-gray-500">by @{moderator}</span>
        </div>
        {taggedUsers.length > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {taggedUsers.join(" ")}
          </div>
        )}
      </div>
    </div>
  );
}

// Main component with layout-specific header rendering
function SmallContainer({
  title,
  description,
  status,
  className,
  moderationNotes,
  layout = "default",
  userInfo,
}: SmallContainerProps) {
  // Render header based on layout type
  const renderHeader = () => {
    const { profileImage, username, time } = userInfo;

    switch (layout) {
      case "single-row":
        return (
          <div className="flex justify-between items-center mb-2">
            <UserProfile
              profileImage={profileImage}
              username={username}
              time={time}
            />
            <StatusBadge status={status} />
          </div>
        );

      case "profile-inline":
        return (
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <img
                className="w-6 h-6 rounded-full mr-2"
                src={profileImage}
                alt={username}
              />
              <span className="text-sm font-medium mr-2">{username}</span>
              <span className="text-xs text-gray-500 mr-2">{time}</span>
              <StatusBadge status={status} />
            </div>
          </div>
        );

      case "profile-stacked":
        return (
          <>
            <div className="flex items-center mb-1">
              <img
                className="w-6 h-6 rounded-full mr-2"
                src={profileImage}
                alt={username}
              />
              <span className="text-sm font-medium">{username}</span>
            </div>
            <div className="flex items-center mb-2">
              <span className="text-xs text-gray-500 mr-2">{time}</span>
              <StatusBadge status={status} />
            </div>
          </>
        );

      case "special":
        return (
          <>
            <div className="flex items-center mb-1">
              <img
                className="w-6 h-6 rounded-full mr-2"
                src={profileImage}
                alt={username}
              />
              <span className="text-sm font-medium">{username}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">{time}</span>
              <StatusBadge status={status} />
            </div>
          </>
        );

      case "default":
      default:
        return (
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              <img
                className="w-6 h-6 rounded-full mr-2"
                src={profileImage}
                alt={username}
              />
              <span className="text-sm font-medium">{username}</span>
              <span className="text-xs text-gray-500 ml-2">{time}</span>
            </div>
            <StatusBadge status={status} />
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "bg-white border border-neutral-300 rounded-lg flex flex-col p-4",
        className,
      )}
    >
      {renderHeader()}

      {/* Title and description */}
      <h2 className="text-base font-semibold mb-2">{title}</h2>
      {description && (
        <p className="text-sm text-gray-600 mb-3">{description}</p>
      )}

      {/* Moderation notes */}
      {moderationNotes && <ModerationNotes {...moderationNotes} />}
    </div>
  );
}

export default SmallContainer;
