import "server-only";

import { retry, type RetryOptions } from "@/lib/travel-search/retry";

const TUTU_MCP_ENDPOINT = "https://mcp.tutu.ru/mcp";

type JsonRpcResponse<T> = {
  result?: T;
  error?: { code: number; message: string; data?: unknown };
};

export type McpTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export type TutuMcpClient = {
  listTools(): Promise<McpTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
};

export class LiveTutuMcpClient implements TutuMcpClient {
  private nextId = 1;

  constructor(
    private readonly endpoint = TUTU_MCP_ENDPOINT,
    private readonly retryOptions: RetryOptions = { attempts: 2, timeoutMs: 4500, retryDelayMs: 350 }
  ) {}

  async listTools() {
    const result = await this.request<{ tools?: McpTool[] }>("tools/list", {});
    return result.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>) {
    return this.request("tools/call", { name, arguments: args });
  }

  private async request<T>(method: string, params: Record<string, unknown>): Promise<T> {
    return retry(async (signal) => {
      const response = await fetch(this.endpoint, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: this.nextId++,
          method,
          params
        })
      });

      if (!response.ok) throw new Error(`Tutu MCP ${method} failed with ${response.status}`);
      const payload = await response.json() as JsonRpcResponse<T>;
      if (payload.error) throw new Error(payload.error.message);
      if (payload.result === undefined) throw new Error(`Tutu MCP ${method} returned no result`);
      return payload.result;
    }, this.retryOptions);
  }
}
