import {
  ConfigurableFieldAgentsMetadata,
  ConfigurableFieldMCPMetadata,
  ConfigurableFieldRAGMetadata,
  ConfigurableFieldUIMetadata,
} from "@/types/configurable";
import { Assistant, GraphSchema } from "@langchain/langgraph-sdk";
import { toast } from "sonner";

function getUiConfig(
  value: unknown,
): { type: string; [key: string]: any } | undefined {
  if (
    typeof value !== "object" ||
    !value ||
    (!("metadata" in value) && !("x_oap_ui_config" in value))
  ) {
    return undefined;
  }
  const uiConfig: Record<string, any> =
    "metadata" in value
      ? (value.metadata as Record<string, any>).x_oap_ui_config
      : (value as Record<string, any>).x_oap_ui_config;
  if (!uiConfig) {
    return undefined;
  }

  if (
    typeof uiConfig === "object" &&
    "type" in uiConfig &&
    uiConfig.type &&
    typeof uiConfig.type === "string"
  ) {
    return {
      ...uiConfig,
      type: uiConfig.type,
    };
  }

  return undefined;
}

/**
 * Converts a LangGraph configuration schema into an array of UI metadata
 * for configurable fields.
 *
 * This function iterates through the properties of the provided schema,
 * looking for a specific metadata field (`x_oap_ui_config`). If found,
 * it extracts the UI configuration and constructs a ConfigurableFieldUIMetadata
 * object, using the property key as the label.
 *
 * @param schema - The LangGraph configuration schema to process.
 * @returns An array of ConfigurableFieldUIMetadata objects representing
 *          the UI configuration for fields found in the schema, or an empty
 *          array if the schema is invalid or contains no UI configurations.
 */
function configSchemaToConfigurableFields(
  schema: GraphSchema["config_schema"],
): ConfigurableFieldUIMetadata[] {
  if (!schema || !schema.properties) {
    return [];
  }

  const fields: ConfigurableFieldUIMetadata[] = [];
  for (const [key, value] of Object.entries(schema.properties)) {
    const uiConfig = getUiConfig(value);
    if (uiConfig && ["mcp", "rag", "hidden"].includes(uiConfig.type)) {
      continue;
    }

    if (uiConfig) {
      const config = uiConfig as Omit<ConfigurableFieldUIMetadata, "label">;
      fields.push({
        label: key,
        ...config,
      });
      continue;
    }

    // If the `x_oap_ui_config` metadata is not found/is missing the `type` field, default to text input
    fields.push({
      label: key,
      type: "text",
    });
  }
  return fields;
}

function configSchemaToToolsConfig(
  schema: GraphSchema["config_schema"],
  runtimeEnv?: {
    mcpServerUrl: string | null;
    mcpAuthRequired: boolean;
  },
): ConfigurableFieldMCPMetadata[] {
  if (!schema || !schema.properties) {
    return [];
  }

  const fields: ConfigurableFieldMCPMetadata[] = [];
  for (const [key, value] of Object.entries(schema.properties)) {
    const uiConfig = getUiConfig(value);
    if (!uiConfig || uiConfig.type !== "mcp") {
      continue;
    }

    // Use runtime env values if provided, otherwise fall back to process.env (for backward compatibility)
    const mcpServerUrl = runtimeEnv?.mcpServerUrl ?? process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? null;
    const mcpAuthRequired = runtimeEnv?.mcpAuthRequired ?? (process.env.NEXT_PUBLIC_MCP_AUTH_REQUIRED === "true");

    if (!mcpServerUrl) {
      // Only show error if we're not using runtime env (to avoid spamming errors during loading)
      if (!runtimeEnv) {
        toast.error("Can not configure MCP tool without MCP server URL", {
          richColors: true,
        });
      }
      continue;
    }

    fields.push({
      label: key,
      type: uiConfig.type,
      default: {
        url: mcpServerUrl,
        tools: [],
        auth_required: mcpAuthRequired,
        ...(uiConfig.default ?? {}),
      },
    });
  }
  return fields;
}

function configSchemaToRagConfig(
  schema: GraphSchema["config_schema"],
  runtimeEnv?: {
    ragApiUrl: string | null;
  },
): ConfigurableFieldRAGMetadata | undefined {
  if (!schema || !schema.properties) {
    return undefined;
  }

  let ragField: ConfigurableFieldRAGMetadata | undefined;
  for (const [key, value] of Object.entries(schema.properties)) {
    const uiConfig = getUiConfig(value);
    if (!uiConfig || uiConfig.type !== "rag") {
      continue;
    }

    // Use runtime env values if provided, otherwise fall back to process.env (for backward compatibility)
    const ragApiUrl = runtimeEnv?.ragApiUrl ?? process.env.NEXT_PUBLIC_RAG_API_URL ?? null;

    ragField = {
      label: key,
      type: uiConfig.type,
      default: {
        ...uiConfig.default,
        rag_url: ragApiUrl ?? uiConfig.default?.rag_url,
      },
    };
    break;
  }
  return ragField;
}

function configSchemaToAgentsConfig(
  schema: GraphSchema["config_schema"],
): ConfigurableFieldAgentsMetadata | undefined {
  if (!schema || !schema.properties) {
    return undefined;
  }

  let agentsField: ConfigurableFieldAgentsMetadata | undefined;
  for (const [key, value] of Object.entries(schema.properties)) {
    const uiConfig = getUiConfig(value);
    if (!uiConfig || uiConfig.type !== "agents") {
      continue;
    }

    agentsField = {
      label: key,
      type: uiConfig.type,
      default: uiConfig.default,
    };
    break;
  }
  return agentsField;
}

type ExtractedConfigs = {
  configFields: ConfigurableFieldUIMetadata[];
  toolConfig: ConfigurableFieldMCPMetadata[];
  ragConfig: ConfigurableFieldRAGMetadata[];
  agentsConfig: ConfigurableFieldAgentsMetadata[];
};

export function extractConfigurationsFromAgent({
  agent,
  schema,
  runtimeEnv,
}: {
  agent: Assistant;
  schema: GraphSchema["config_schema"];
  runtimeEnv?: {
    mcpServerUrl: string | null;
    mcpAuthRequired: boolean;
    ragApiUrl: string | null;
  };
}): ExtractedConfigs {
  const configFields = configSchemaToConfigurableFields(schema);
  const toolConfig = configSchemaToToolsConfig(schema, runtimeEnv ? {
    mcpServerUrl: runtimeEnv.mcpServerUrl,
    mcpAuthRequired: runtimeEnv.mcpAuthRequired,
  } : undefined);
  const ragConfig = configSchemaToRagConfig(schema, runtimeEnv ? {
    ragApiUrl: runtimeEnv.ragApiUrl,
  } : undefined);
  const agentsConfig = configSchemaToAgentsConfig(schema);

  const configFieldsWithDefaults = configFields.map((f) => {
    const defaultConfig = agent.config?.configurable?.[f.label] ?? f.default;
    return {
      ...f,
      default: defaultConfig,
    };
  });

  const configurable =
    agent.config?.configurable ?? ({} as Record<string, any>);

  const configToolsWithDefaults = toolConfig.map((f) => {
    const storedConfig = configurable[f.label] as ConfigurableFieldMCPMetadata["default"] | undefined;
    const defaultConfig = storedConfig ?? f.default;
    
    // Use runtime env for auth_required if available, otherwise fall back to process.env
    const mcpAuthRequired = runtimeEnv?.mcpAuthRequired ?? (process.env.NEXT_PUBLIC_MCP_AUTH_REQUIRED === "true");
    
    // If we have runtime env values, check if stored config URL differs from current env
    // If it does, prefer the runtime env URL (current .env value) over stored config
    let finalConfig = defaultConfig;
    if (runtimeEnv?.mcpServerUrl && storedConfig?.url && storedConfig.url !== runtimeEnv.mcpServerUrl) {
      // Stored config has different URL than current env - use current env URL
      finalConfig = {
        ...storedConfig,
        url: runtimeEnv.mcpServerUrl,
        auth_required: mcpAuthRequired,
      };
    } else if (defaultConfig) {
      // Use stored/default config but ensure auth_required is current
      finalConfig = {
        ...defaultConfig,
        auth_required: mcpAuthRequired,
      };
    }
    
    return {
      ...f,
      default: finalConfig,
    };
  });

  const configRagWithDefaults = ragConfig
    ? {
        ...ragConfig,
        default: {
          collections:
            (
              configurable[
                ragConfig.label
              ] as ConfigurableFieldRAGMetadata["default"]
            )?.collections ??
            ragConfig.default?.collections ??
            [],
          rag_url:
            configurable[ragConfig.label]?.rag_url ??
            runtimeEnv?.ragApiUrl ??
            process.env.NEXT_PUBLIC_RAG_API_URL,
        },
      }
    : undefined;

  const configurableAgentsWithDefaults = agentsConfig
    ? {
        ...agentsConfig,
        default:
          Array.isArray(configurable[agentsConfig.label]) &&
          (configurable[agentsConfig.label] as any[]).length > 0
            ? (configurable[agentsConfig.label] as {
                agent_id?: string;
                deployment_url?: string;
                name?: string;
              }[])
            : Array.isArray(agentsConfig.default)
              ? agentsConfig.default
              : [],
      }
    : undefined;

  return {
    configFields: configFieldsWithDefaults,
    toolConfig: configToolsWithDefaults,
    ragConfig: configRagWithDefaults ? [configRagWithDefaults] : [],
    agentsConfig: configurableAgentsWithDefaults
      ? [configurableAgentsWithDefaults]
      : [],
  };
}

export function getConfigurableDefaults(
  configFields: ConfigurableFieldUIMetadata[],
  toolConfig: ConfigurableFieldMCPMetadata[],
  ragConfig: ConfigurableFieldRAGMetadata[],
  agentsConfig: ConfigurableFieldAgentsMetadata[],
): Record<string, any> {
  const defaults: Record<string, any> = {};
  configFields.forEach((field) => {
    defaults[field.label] = field.default;
  });
  toolConfig.forEach((field) => {
    defaults[field.label] = field.default;
  });
  ragConfig.forEach((field) => {
    defaults[field.label] = field.default;
  });
  agentsConfig.forEach((field) => {
    defaults[field.label] = field.default;
  });
  return defaults;
}
