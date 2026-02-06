"use client";

import { useState, useCallback } from "react";
import { Copy, Download, ImageIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExportButtonGroupProps {
  onCopy?: () => Promise<boolean>;
  onCSV?: () => void;
  onPNG?: () => Promise<boolean>;
  className?: string;
}

export function ExportButtonGroup({
  onCopy,
  onCSV,
  onPNG,
  className = "",
}: ExportButtonGroupProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!onCopy) return;
    const ok = await onCopy();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [onCopy]);

  return (
    <div
      className={`inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${className}`}
    >
      {onCopy && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-positive" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{copied ? "Copied!" : "Copy to clipboard"}</p>
          </TooltipContent>
        </Tooltip>
      )}
      {onCSV && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCSV}
            >
              <Download className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Download CSV</p>
          </TooltipContent>
        </Tooltip>
      )}
      {onPNG && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onPNG}
            >
              <ImageIcon className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Export as PNG</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
