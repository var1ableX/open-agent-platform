import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useQueryState } from "nuqs";
import { SquarePen } from "lucide-react";
import { AgentsCombobox } from "@/components/ui/agents-combobox";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { useAgentsContext } from "@/providers/Agents";
import { isUserSpecifiedDefaultAgent } from "@/lib/agent-utils";

export function NewThreadButton(props: { hasMessages: boolean }) {
  const { agents, loading } = useAgentsContext();
  const [open, setOpen] = useState(false);

  const [agentId, setAgentId] = useQueryState("agentId");
  const [deploymentId, setDeploymentId] = useQueryState("deploymentId");
  const [_, setThreadId] = useQueryState("threadId");

  const handleNewThread = useCallback(() => {
    setThreadId(null);
  }, [setThreadId]);

  const isMac = useMemo(
    () => /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent),
    [],
  );

  useLayoutEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLocaleLowerCase() === "o"
      ) {
        e.preventDefault();
        handleNewThread();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewThread]);

  const onAgentChange = useCallback(
    (v: string | string[] | undefined) => {
      const nextValue = Array.isArray(v) ? v[0] : v;
      if (!nextValue) return;

      const [agentId, deploymentId] = nextValue.split(":");
      setAgentId(agentId);
      setDeploymentId(deploymentId);
      setThreadId(null);
    },
    [setAgentId, setDeploymentId, setThreadId],
  );

  const agentValue =
    agentId && deploymentId ? `${agentId}:${deploymentId}` : undefined;

  useEffect(() => {
    if (agentValue || !agents.length) {
      return;
    }
    const defaultAgent = agents.find(isUserSpecifiedDefaultAgent);
    if (defaultAgent) {
      onAgentChange(
        `${defaultAgent.assistant_id}:${defaultAgent.deploymentId}`,
      );
    }
  }, [agents, agentValue, onAgentChange]);

  if (!props.hasMessages) {
    return (
      <AgentsCombobox
        agents={agents}
        agentsLoading={loading}
        value={agentValue}
        setValue={onAgentChange}
        open={open}
        setOpen={setOpen}
        triggerAsChild
        className="min-w-auto"
      />
    );
  }

  return (
    <div className="flex rounded-md shadow-xs">
      <AgentsCombobox
        agents={agents}
        agentsLoading={loading}
        value={agentValue}
        setValue={onAgentChange}
        open={open}
        setOpen={setOpen}
        triggerAsChild
        className="relative min-w-auto shadow-none focus-within:z-10"
        style={{
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          borderRight: 0,
        }}
        footer={
          <div className="text-secondary-foreground bg-secondary flex gap-2 p-3 pr-10 pb-3 text-xs">
            <SquarePen className="size-4 shrink-0" />
            <span className="text-secondary-foreground mb-[1px] text-xs">
              Selecting a different agent will create a new thread.
            </span>
          </div>
        }
      />

      {props.hasMessages && (
        <TooltipIconButton
          size="lg"
          className="relative size-9 p-4 shadow-none focus-within:z-10"
          tooltip={
            isMac ? "New thread (Cmd+Shift+O)" : "New thread (Ctrl+Shift+O)"
          }
          variant="outline"
          onClick={handleNewThread}
          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
        >
          <SquarePen className="size-4" />
        </TooltipIconButton>
      )}
    </div>
  );
}
