import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Plus, MoreVertical } from "lucide-react";
import { ContentBlocksPreview } from "./messages/ContentBlocksPreview";
import type { Base64ContentBlock } from "@langchain/core/messages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface MobileChatInputProps {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNewThread: () => void;
  hasInput: boolean;
  setHasInput: (value: boolean) => void;
  contentBlocks: Base64ContentBlock[];
  onRemoveBlock: (idx: number) => void;
  isLoading: boolean;
  onStop: () => void;
  hideToolCalls: boolean | null;
  setHideToolCalls: (value: boolean | null) => void;
  hasMessages: boolean;
  disabled?: boolean;
}

export function MobileChatInput({
  onSubmit,
  onPaste,
  onFileUpload,
  onNewThread,
  hasInput,
  setHasInput,
  contentBlocks,
  onRemoveBlock,
  isLoading,
  onStop,
  hideToolCalls,
  setHideToolCalls,
  hasMessages,
  disabled = false,
}: MobileChatInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-2"
    >
      <ContentBlocksPreview
        blocks={contentBlocks}
        onRemove={onRemoveBlock}
      />

      <div className="relative">
        <textarea
          name="input"
          onChange={(e) => setHasInput(!!e.target.value.trim())}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              const el = e.target as HTMLElement | undefined;
              const form = el?.closest("form");
              form?.requestSubmit();
            }
          }}
          placeholder="Type your message..."
          className="focus:border-primary focus:ring-primary/20 field-sizing-content w-full resize-none rounded-lg border border-gray-300 bg-white p-3 pr-12 shadow-sm focus:ring-2 focus:outline-none"
          rows={3}
        />
      </div>

      {/* Mobile action bar */}
      <div className="flex items-center justify-between gap-2">
        {/* Left side: Action buttons */}
        <div className="flex items-center gap-2">
          <Label
            htmlFor="mobile-file-input"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
            title="Upload file"
          >
            <Plus className="size-5 text-gray-600" />
          </Label>
          <input
            id="mobile-file-input"
            type="file"
            onChange={onFileUpload}
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            className="hidden"
          />

          {/* More options menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                type="button"
              >
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={onNewThread}
                disabled={!hasMessages}
              >
                New Thread
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <div className="flex items-center gap-2">
                  <Switch
                    id="mobile-hide-tool-calls"
                    checked={hideToolCalls ?? false}
                    onCheckedChange={setHideToolCalls}
                  />
                  <Label
                    htmlFor="mobile-hide-tool-calls"
                    className="cursor-pointer text-sm"
                  >
                    Hide Tool Calls
                  </Label>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side: Send button */}
        {isLoading ? (
          <Button
            onClick={onStop}
            className="h-10 max-w-[120px] flex-1"
            type="button"
          >
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={disabled || (!hasInput && contentBlocks.length === 0)}
            className="h-10 max-w-[120px] flex-1 shadow-md"
          >
            Send
          </Button>
        )}
      </div>
    </form>
  );
}
