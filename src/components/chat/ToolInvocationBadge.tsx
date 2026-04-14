import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

export function getLabel(toolName: string, args: Record<string, unknown>): string {
  const filename = (args?.path as string)?.split("/").pop() ?? "";

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create":
        return `Creating ${filename}`;
      case "str_replace":
      case "insert":
        return `Editing ${filename}`;
      case "view":
        return `Reading ${filename}`;
      default:
        return `Editing ${filename}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "rename":
        return `Renaming ${filename}`;
      case "delete":
        return `Deleting ${filename}`;
      default:
        return toolName;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ tool }: { tool: ToolInvocation }) {
  const label = getLabel(tool.toolName, tool.args as Record<string, unknown>);
  const done = tool.state === "result" && tool.result != null;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
