import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function AvatarDemo() {
  return (
    <Avatar className="w-4 h-4 rounded-full">
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  );
}
