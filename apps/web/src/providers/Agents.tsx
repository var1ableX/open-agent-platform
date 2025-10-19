"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { getDeployments } from "@/lib/environment/deployments";
import { Agent } from "@/types/agent";
import { Deployment } from "@/types/deployment";
import {
  groupAgentsByGraphs,
  isSystemCreatedDefaultAssistant,
  isUserCreatedDefaultAssistant,
} from "@/lib/agent-utils";
import { useAgents } from "@/hooks/use-agents";
import { extractConfigurationsFromAgent } from "@/lib/ui-config";
import { createClient } from "@/lib/client";
import { useAuthContext } from "./Auth";
import { toast } from "sonner";
import { Assistant } from "@langchain/langgraph-sdk";

async function getOrCreateDefaultAssistants(
  deployment: Deployment,
  accessToken?: string,
): Promise<Assistant[]> {
  const baseApiUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
  if (!baseApiUrl) {
    throw new Error(
      "Failed to get default assistants: Base API URL not configured. Please set NEXT_PUBLIC_BASE_API_URL",
    );
  }

  try {
    const url = `${baseApiUrl}/langgraph/defaults?deploymentId=${deployment.id}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get default assistants: ${response.status} ${response.statusText} ${errorData.error || ""}`,
      );
    }

    const defaultAssistants = await response.json();
    return defaultAssistants;
  } catch (error) {
    console.error("Error getting default assistants:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function getAgents(
  deployments: Deployment[],
  accessToken: string,
  getAgentConfigSchema: (
    agentId: string,
    deploymentId: string,
  ) => Promise<Record<string, any> | undefined>,
): Promise<Agent[]> {
  const agentsPromise: Promise<Agent[]>[] = deployments.map(
    async (deployment) => {
      const client = createClient(deployment.id, accessToken);

      const [defaultAssistants, allUserAssistants] = await Promise.all([
        getOrCreateDefaultAssistants(deployment, accessToken),
        client.assistants.search({
          limit: 100,
        }),
      ]);
      const assistantMap = new Map<string, Assistant>();

      // Add default assistants to the map
      defaultAssistants.forEach((assistant) => {
        assistantMap.set(assistant.assistant_id, assistant);
      });

      // Add user assistants to the map, potentially overriding defaults
      allUserAssistants.forEach((assistant) => {
        assistantMap.set(assistant.assistant_id, assistant);
      });

      // Convert map values back to array
      const allAssistants: Assistant[] = Array.from(assistantMap.values());

      const assistantsGroupedByGraphs = groupAgentsByGraphs(allAssistants);

      const assistantsPromise: Promise<Agent[]>[] =
        assistantsGroupedByGraphs.map(async (group) => {
          // We must get the agent config schema for each graph in a deployment,
          // not just for each deployment, as a deployment can have multiple graphs
          // each with their own unique config schema.
          const defaultAssistant =
            group.find((a) => isUserCreatedDefaultAssistant(a)) ?? group[0];
          const schema = await getAgentConfigSchema(
            defaultAssistant.assistant_id,
            deployment.id,
          );

          const supportedConfigs: string[] = [];
          if (schema) {
            const { toolConfig, ragConfig, agentsConfig } =
              extractConfigurationsFromAgent({
                agent: defaultAssistant,
                schema,
              });
            if (toolConfig.length) {
              supportedConfigs.push("tools");
            }
            if (ragConfig.length) {
              supportedConfigs.push("rag");
            }
            if (agentsConfig.length) {
              supportedConfigs.push("supervisor");
            }
          }

          return group.map((assistant) => ({
            ...assistant,
            deploymentId: deployment.id,
            supportedConfigs: supportedConfigs as [
              "tools" | "rag" | "supervisor",
            ],
          }));
        });

      return (await Promise.all(assistantsPromise)).flat();
    },
  );

  const results = await Promise.allSettled(agentsPromise);

  // Filter out failed deployments and log warnings
  const successfulAgents: Agent[] = [];
  results.forEach((result, index) => {
    const deployment = deployments[index];
    if (result.status === "fulfilled") {
      successfulAgents.push(...result.value);
    } else {
      // If the default deployment fails, throw an error
      if (deployment.isDefault) {
        throw new Error(
          `Failed to connect to default deployment '${deployment.id}'. ` +
            `Please ensure the default agent is running. Error: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
      // For non-default deployments, just log a warning
      console.warn(
        `Failed to load agents from deployment '${deployment.id}' (non-critical):`,
        result.reason,
      );
    }
  });

  return successfulAgents;
}

type AgentsContextType = {
  /**
   * A two-dimensional array of agents.
   * Each subarray contains the agents for a specific deployment.
   */
  agents: Agent[];
  /**
   * Refreshes the agents list by fetching the latest agents from the API,
   * and updating the state.
   */
  refreshAgents: () => Promise<void>;
  /**
   * Updates a single agent in the local state (optimistic update).
   * Use this after successfully updating an agent to avoid race conditions.
   */
  updateAgentInState: (updatedAgent: Agent) => void;
  /**
   * Whether the agents list is currently loading.
   */
  loading: boolean;
  /**
   * Whether the agents list is currently loading.
   */
  refreshAgentsLoading: boolean;
};
const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export const AgentsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { session } = useAuthContext();
  const agentsState = useAgents();
  const deployments = useMemo(() => getDeployments(), []);
  const [agents, setAgents] = useState<Agent[]>([]);
  const firstRequestMade = useRef(false);
  const [loading, setLoading] = useState(false);
  const [refreshAgentsLoading, setRefreshAgentsLoading] = useState(false);

  useEffect(() => {
    if (agents.length > 0 || firstRequestMade.current || !session?.accessToken)
      return;

    firstRequestMade.current = true;
    setLoading(true);
    getAgents(
      deployments,
      session.accessToken,
      agentsState.getAgentConfigSchema,
    )
      // Never expose the system created default assistants to the user
      .then((a) =>
        setAgents(a.filter((a) => !isSystemCreatedDefaultAssistant(a))),
      )
      .catch((error) => {
        console.error("Failed to load agents:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to load agents",
          {
            richColors: true,
            duration: 10000,
          },
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, deployments, agentsState.getAgentConfigSchema]);

  async function refreshAgents() {
    if (!session?.accessToken) {
      toast.error("No access token found", {
        richColors: true,
      });
      return;
    }
    try {
      setRefreshAgentsLoading(true);
      const newAgents = await getAgents(
        deployments,
        session.accessToken,
        agentsState.getAgentConfigSchema,
      );
      const filteredAgents = newAgents.filter(
        (a) => !isSystemCreatedDefaultAssistant(a),
      );
      console.warn("[REFRESH-AGENTS] Fetched agents:", {
        count: filteredAgents.length,
        agentIds: filteredAgents.map((a) => ({
          id: a.assistant_id,
          graphId: a.graph_id,
          hasRagConfig: !!a.config?.configurable?.rag,
          ragCollections: (a.config?.configurable?.rag as { collections?: string[] } | undefined)
            ?.collections,
        })),
      });
      setAgents(filteredAgents);
    } catch (e) {
      console.error("Failed to refresh agents", e);
      // Silently handle JWT expiration errors - they're expected after token expires
      if (e instanceof Error && e.message.includes("JWT")) {
        console.warn("[REFRESH-AGENTS] JWT expired, skipping refresh");
        return;
      }
      toast.error(e instanceof Error ? e.message : "Failed to refresh agents", {
        richColors: true,
        duration: 10000,
      });
    } finally {
      setRefreshAgentsLoading(false);
    }
  }

  function updateAgentInState(updatedAgent: Agent) {
    setAgents((prevAgents) =>
      prevAgents.map((a) =>
        a.assistant_id === updatedAgent.assistant_id &&
        a.deploymentId === updatedAgent.deploymentId
          ? updatedAgent
          : a,
      ),
    );
  }

  const agentsContextValue = {
    agents,
    loading,
    refreshAgents,
    updateAgentInState,
    refreshAgentsLoading,
  };

  return (
    <AgentsContext.Provider value={agentsContextValue}>
      {children}
    </AgentsContext.Provider>
  );
};

// Create a custom hook to use the context
// eslint-disable-next-line react-refresh/only-export-components
export const useAgentsContext = (): AgentsContextType => {
  const context = useContext(AgentsContext);
  if (context === undefined) {
    throw new Error("useAgentsContext must be used within a StreamProvider");
  }
  return context;
};

export default AgentsContext;
