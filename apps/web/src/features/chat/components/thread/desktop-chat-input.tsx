import { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { LoaderCircle, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ContentBlocksPreview } from "./messages/ContentBlocksPreview";
import type { Base64ContentBlock } from "@langchain/core/messages";
import { NewThreadButton } from "./NewThreadButton";

interface DesktopChatInputProps {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
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

export function DesktopChatInput({
  onSubmit,
  onPaste,
  onFileUpload,
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
}: DesktopChatInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2"
    >
      <ContentBlocksPreview
        blocks={contentBlocks}
        onRemove={onRemoveBlock}
      />
      <textarea
        name="input"
        onChange={(e) => setHasInput(!!e.target.value.trim())}
        onPaste={onPaste}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            const el = e.target as HTMLElement | undefined;
            const form = el?.closest("form");
            form?.requestSubmit();
          }
        }}
        placeholder="Type your message..."
        className="field-sizing-content resize-none border-none bg-transparent p-3.5 pb-0 shadow-none ring-0 outline-none focus:ring-0 focus:outline-none"
      />

      <div className="flex items-center gap-6 p-2 pt-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 space-x-2">
            <NewThreadButton hasMessages={hasMessages} />
            <Switch
              id="render-tool-calls"
              checked={hideToolCalls ?? false}
              onCheckedChange={setHideToolCalls}
            />
            <Label
              htmlFor="render-tool-calls"
              className="cursor-pointer text-sm text-gray-600"
            >
              Hide Tool Calls
            </Label>
          </div>
        </div>
        <Label
          htmlFor="desktop-file-input"
          className="flex cursor-pointer"
        >
          <Plus className="size-5 text-gray-600" />
          <span className="text-sm text-gray-600">Upload PDF or Image</span>
        </Label>
        <input
          id="desktop-file-input"
          type="file"
          onChange={onFileUpload}
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          className="hidden"
        />
        {isLoading ? (
          <Button
            key="stop"
            onClick={onStop}
            className="ml-auto"
            type="button"
          >
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Cancel
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={disabled || (!hasInput && contentBlocks.length === 0)}
            className="ml-auto shadow-md transition-all"
          >
            Send
          </Button>
        )}
      </div>
    </form>
  );
}
