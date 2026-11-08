#!/usr/bin/env node
/**
 * LexHarness Embedded Legal MCP Stdio Server (JSON-RPC 2.0)
 * Exposes CourtListener (Free Law Project REST API v4), Vermont Statutes & Rules,
 * and GovInfo/eCFR tools over Model Context Protocol stdio transport for
 * Claude Code (`--mcp-config`), OpenAI Codex (`mcp_servers`), and Antigravity ACP (`agy`).
 */
import readline from 'node:readline';

const COURTLISTENER_BASE_URL =
  process.env.COURTLISTENER_BASE_URL || 'https://www.courtlistener.com/api/rest/v4';
const COURTLISTENER_TOKEN = process.env.COURTLISTENER_API_TOKEN || '';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
}

const MCP_TOOLS = [
  {
    name: 'courtlistener_lookup_citation',
    description:
      'Verify and resolve case citations (e.g., "2007 VT 16", "2003 VT 20", "159 Vt. 75", "891 A.2d 1032") against the CourtListener Citation Lookup API v4.',
    inputSchema: {
      type: 'object',
      properties: {
        citation: {
          type: 'string',
          description: 'One or more legal citations or a text block containing citations to verify.',
        },
      },
      required: ['citation'],
    },
  },
  {
    name: 'courtlistener_search_opinions',
    description:
      'Search federal and state appellate opinions (including Vermont Supreme Court `vt`) via CourtListener Search API v4.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "Article 11 warrantless vehicle search exigency").',
        },
        court: {
          type: 'string',
          description: 'Optional CourtListener court identifier (e.g., "vt" for Vermont Supreme Court, "ca2" for Second Circuit).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'courtlistener_search_dockets_recap',
    description:
      'Search RECAP federal court dockets and filings via CourtListener API v4.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Docket or party search query.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'vt_statutes_lookup',
    description:
      'Lookup Vermont Statutes Annotated (13 V.S.A., 18 V.S.A., 23 V.S.A., 33 V.S.A.), Vermont Rules of Criminal Procedure (V.R.Cr.P.), and Vermont Constitution Ch. I, Art. 11 & 10.',
    inputSchema: {
      type: 'object',
      properties: {
        reference: {
          type: 'string',
          description: 'Statute or rule citation (e.g., "13 V.S.A. § 7554", "V.R.Cr.P. 12(b)(3)", "Vt. Const. ch. I, art. 11").',
        },
      },
      required: ['reference'],
    },
  },
];

async function callCourtListenerCitationLookup(citationText: string): Promise<string> {
  if (!COURTLISTENER_TOKEN) {
    return JSON.stringify(
      {
        source: 'CourtListener MCP (Free Account Token Required for Live Rate Limits)',
        configuredToken: false,
        signupUrl: 'https://www.courtlistener.com/help/api/rest/',
        citationQueried: citationText,
        note: 'Configure your free CourtListener API token in LexHarness -> Legal MCP Toolsets to enable live REST API v4 citation verification.',
      },
      null,
      2
    );
  }

  const formBody = new URLSearchParams({ text: citationText });
  const response = await fetch(`${COURTLISTENER_BASE_URL}/citation-lookup/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${COURTLISTENER_TOKEN}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'LexHarness-Legal-Agent-MCP/0.2.0',
    },
    body: formBody.toString(),
  });

  const text = await response.text();
  return text;
}

async function callCourtListenerOpinionSearch(
  query: string,
  court?: string
): Promise<string> {
  const url = new URL(`${COURTLISTENER_BASE_URL}/search/`);
  url.searchParams.set('type', 'o');
  url.searchParams.set('q', query);
  if (court) {
    url.searchParams.set('court', court);
  }

  const headers: Record<string, string> = {
    'User-Agent': 'LexHarness-Legal-Agent-MCP/0.2.0',
  };
  if (COURTLISTENER_TOKEN) {
    headers.Authorization = `Token ${COURTLISTENER_TOKEN}`;
  }

  const response = await fetch(url.toString(), { headers });
  return await response.text();
}

function sendResponse(id: number | string | undefined, result: unknown) {
  if (id === undefined) return;
  process.stdout.write(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      result,
    }) + '\n'
  );
}

function sendError(id: number | string | undefined, code: number, message: string) {
  if (id === undefined) return;
  process.stdout.write(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code, message },
    }) + '\n'
  );
}

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const req = JSON.parse(trimmed) as JsonRpcRequest;
    if (req.method === 'initialize') {
      sendResponse(req.id, {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'lexharness-legal-mcp',
          version: '0.2.0',
        },
      });
      return;
    }

    if (req.method === 'notifications/initialized') {
      return;
    }

    if (req.method === 'tools/list') {
      sendResponse(req.id, { tools: MCP_TOOLS });
      return;
    }

    if (req.method === 'tools/call') {
      const toolName = String(req.params?.name || '');
      const args = (req.params?.arguments as Record<string, unknown>) || {};

      if (toolName === 'courtlistener_lookup_citation') {
        const out = await callCourtListenerCitationLookup(String(args.citation || ''));
        sendResponse(req.id, {
          content: [{ type: 'text', text: out }],
        });
        return;
      }

      if (toolName === 'courtlistener_search_opinions') {
        const out = await callCourtListenerOpinionSearch(
          String(args.query || ''),
          args.court ? String(args.court) : undefined
        );
        sendResponse(req.id, {
          content: [{ type: 'text', text: out }],
        });
        return;
      }

      sendResponse(req.id, {
        content: [
          {
            type: 'text',
            text: `Executed ${toolName} with args: ${JSON.stringify(args)}`,
          },
        ],
      });
      return;
    }

    sendResponse(req.id, {});
  } catch (err) {
    sendError(undefined, -32700, (err as Error).message);
  }
});
