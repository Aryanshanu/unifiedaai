 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
 
 interface ExpandableModelResponseProps {
   response: string;
   previewLength?: number;
   className?: string;
 }
 
 export function ExpandableModelResponse({
   response,
   previewLength = 300,
   className = "",
 }: ExpandableModelResponseProps) {
   const [expanded, setExpanded] = useState(false);
   const [copied, setCopied] = useState(false);
 
   const shouldTruncate = response.length > previewLength;
   const displayText = expanded || !shouldTruncate 
     ? response 
     : response.slice(0, previewLength) + "...";
 
   const handleCopy = async () => {
     await navigator.clipboard.writeText(response);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000);
   };
 
   return (
     <div className={className}>
       <p className="text-sm text-muted-foreground whitespace-pre-wrap">
         {displayText}
       </p>
       <div className="flex items-center gap-2 mt-2">
         {shouldTruncate && (
           <Button
             variant="ghost"
             size="sm"
             onClick={() => setExpanded(!expanded)}
             className="h-7 px-2 text-xs"
           >
             {expanded ? (
               <>
                 <ChevronUp className="h-3 w-3 mr-1" />
                 Show Less
               </>
             ) : (
               <>
                 <ChevronDown className="h-3 w-3 mr-1" />
                 Show Full Response ({response.length} chars)
               </>
             )}
           </Button>
         )}
         <Button
           variant="ghost"
           size="sm"
           onClick={handleCopy}
           className="h-7 px-2 text-xs"
         >
           {copied ? (
             <>
               <Check className="h-3 w-3 mr-1" />
               Copied
             </>
           ) : (
             <>
               <Copy className="h-3 w-3 mr-1" />
               Copy
             </>
           )}
         </Button>
       </div>
     </div>
   );
 }