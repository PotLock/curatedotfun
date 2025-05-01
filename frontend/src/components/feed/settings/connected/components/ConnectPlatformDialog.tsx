import { Platform } from "@crosspost/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../../../ui/dialog";
import { ConnectPlatform } from "./ConnectPlatform";
import { useConnectedAccounts } from "../../../../../store/platformAccountsStore";
import { PlatformAccountItem } from "./PlatformAccount";

const SUPPORTED_PLATFORMS = [Platform.TWITTER];

interface ConnectPlatformDialogProps {
    children: React.ReactNode;
}

export function ConnectPlatformDialog({ children }: ConnectPlatformDialogProps) {
    const { data: connectedAccounts } = useConnectedAccounts();

    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Connect Platforms</DialogTitle>
                    <DialogDescription>
                        Connect your social media accounts to crosspost content
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        {SUPPORTED_PLATFORMS.map((platform) => {
                        const platformAccounts = connectedAccounts?.filter(
                            (account) => account.platform === platform
                        ) || [];

                        return (
                            <div key={platform} className="space-y-2">
                            <h4 className="font-medium">{platform}</h4>
                            {platformAccounts.length > 0 ? (
                                <div className="space-y-2">
                                {platformAccounts.map((account) => (
                                    <PlatformAccountItem
                                    key={account.userId}
                                    account={account}
                                    />
                                ))}
                                </div>
                            ) : (
                                <ConnectPlatform platform={platform} />
                            )}
                            </div>
                        );
                        })}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
} 