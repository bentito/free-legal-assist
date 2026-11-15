import fs from 'node:fs';
import path from 'node:path';
import { RoutingDecisionLog } from '../../../shared/types';
import { LegalDatabase } from '../../db/database';

export class RoutingDebugLogger {
  private logDirectory: string;
  private jsonlFilePath: string;

  constructor(private db: LegalDatabase) {
    this.logDirectory = path.join(db.getStorageDir(), 'logs');
    this.jsonlFilePath = path.join(this.logDirectory, 'routing-decisions.jsonl');
    this.ensureLogDir();
  }

  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDirectory)) {
      try {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      } catch {
        // Ignore if created concurrently
      }
    }
  }

  /**
   * Appends decision telemetry to SQLite and local append-only JSON Lines file.
   */
  public async logDecision(decision: RoutingDecisionLog): Promise<void> {
    // 1. Persist to SQLite
    this.db.insertRoutingDebugLog(decision, true);

    // 2. Stream to append-only JSONL
    try {
      this.ensureLogDir();
      const line = JSON.stringify(decision) + '\n';
      fs.appendFileSync(this.jsonlFilePath, line, 'utf8');
    } catch (err) {
      console.error('Failed writing routing decision to JSONL log:', err);
    }
  }

  public getLogs(matterId?: string, limit = 50): RoutingDecisionLog[] {
    return this.db.listRoutingDebugLogs(matterId, limit);
  }

  public clearLogs(matterId?: string): void {
    this.db.clearRoutingDebugLogs(matterId);
    if (!matterId && fs.existsSync(this.jsonlFilePath)) {
      try {
        fs.writeFileSync(this.jsonlFilePath, '', 'utf8');
      } catch (err) {
        console.error('Failed clearing routing decisions JSONL log:', err);
      }
    }
  }

  /**
   * Exports sanitized diagnostic bundle as JSON string or writes to disk if path given.
   */
  public async exportLogs(destinationPath?: string): Promise<string> {
    const logs = this.db.listRoutingDebugLogs(undefined, 500);
    const exportBundle = {
      exportedAt: new Date().toISOString(),
      format: 'LexHarness Routing Decision Telemetry Audit Bundle',
      totalDecisions: logs.length,
      decisions: logs,
    };
    const jsonStr = JSON.stringify(exportBundle, null, 2);

    if (destinationPath) {
      const dir = path.dirname(destinationPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(destinationPath, jsonStr, 'utf8');
    }

    return jsonStr;
  }

  public getJsonlPath(): string {
    return this.jsonlFilePath;
  }
}
