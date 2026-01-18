import { Shield, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TruthBanner() {
  return (
    <div className={cn(
      "w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500",
      "text-white py-2.5 px-4 flex items-center justify-center gap-3"
    )}>
      <Shield className="w-4 h-4" />
      <span className="text-sm font-medium">
        <CheckCircle2 className="w-4 h-4 inline mr-1" />
        All legacy data cleared on Dec 11, 2025. Only production traffic flows here.
      </span>
    </div>
  );
}