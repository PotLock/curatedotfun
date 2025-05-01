import { Button } from "../../../ui/button";

export default function ConnectedAccounts() {
  return (
    <div>
      <div className="flex justify-between items-center w-full">
        <h3 className="text-2xl font-light">Connected Accounts</h3>
        <Button>Connect Account</Button>
      </div>
    </div>
  );
}
