import { Badge } from "@/components/ui/badge";
import { Info, ArrowRight, ArrowLeft, ArrowLeftRight } from "lucide-react";

interface InputOutputScopeProps {
  scope: "INPUT" | "OUTPUT" | "BOTH";
  inputDescription?: string;
  outputDescription?: string;
}

export function InputOutputScope({ scope, inputDescription, outputDescription }: InputOutputScopeProps) {
  const getScopeIcon = () => {
    switch (scope) {
      case "INPUT":
        return <ArrowRight className="w-4 h-4" />;
      case "OUTPUT":
        return <ArrowLeft className="w-4 h-4" />;
      case "BOTH":
        return <ArrowLeftRight className="w-4 h-4" />;
    }
  };

  const getScopeColor = () => {
    switch (scope) {
      case "INPUT":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "OUTPUT":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "BOTH":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    }
  };

  return (
    <div className={`p-4 rounded-lg border mb-6 ${getScopeColor()}`}>
      <div className="flex items-center gap-3 mb-2">
        <Badge variant="outline" className={getScopeColor()}>
          {getScopeIcon()}
          <span className="ml-1">{scope} Analysis</span>
        </Badge>
        <Info className="w-4 h-4 opacity-60" />
      </div>
      <div className="space-y-1 text-sm">
        {inputDescription && (
          <p className="flex items-center gap-2">
            <ArrowRight className="w-3 h-3" />
            <span className="font-medium">Input:</span> {inputDescription}
          </p>
        )}
        {outputDescription && (
          <p className="flex items-center gap-2">
            <ArrowLeft className="w-3 h-3" />
            <span className="font-medium">Output:</span> {outputDescription}
          </p>
        )}
      </div>
    </div>
  );
}
