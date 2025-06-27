import { Clock, Sparkles } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface ComingSoonProps {
  title: string;
  description?: string;
  features?: string[];
}

export function ComingSoon({ title, description, features }: ComingSoonProps) {
  return (
    <Card className="p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Sparkles className="h-8 w-8" />
          <h2 className="text-2xl font-semibold">{title}</h2>
        </div>

        <Badge
          variant="secondary"
          className="flex items-center space-x-1 w-fit mx-auto"
        >
          <Clock className="h-3 w-3" />
          <span>Coming Soon</span>
        </Badge>

        {description && (
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {description}
          </p>
        )}
      </div>

      {features && features.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-center">What to expect:</h3>
          <ul className="space-y-2 max-w-md mx-auto">
            {features.map((feature, index) => (
              <li
                key={index}
                className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
