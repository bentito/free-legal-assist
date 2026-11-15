import fs from 'node:fs';
import path from 'node:path';
import { MatterRosterEntity } from './PiiScrubberVault';

export class OnnxPiiClassifier {
  private isModelLoaded = false;
  private onnxSession: unknown = null;

  constructor(private modelPath?: string) {
    this.initModel();
  }

  private initModel(): void {
    const candidatePath =
      this.modelPath ||
      path.join(process.cwd(), 'resources', 'models', 'legal-ner-scrubber.onnx');

    if (!fs.existsSync(candidatePath)) {
      this.isModelLoaded = false;
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ort = require('onnxruntime-node');
      if (ort && ort.InferenceSession) {
        ort.InferenceSession.create(candidatePath)
          .then((session: unknown) => {
            this.onnxSession = session;
            this.isModelLoaded = true;
          })
          .catch(() => {
            this.isModelLoaded = false;
          });
      }
    } catch {
      this.isModelLoaded = false;
    }
  }

  /**
   * Scans text for contextual legal entities not in the initial Matter roster,
   * such as unlisted law enforcement officers, judges, or witnesses.
   */
  public async extractContextualEntities(text: string): Promise<MatterRosterEntity[]> {
    if (!text || text.trim().length === 0) return [];

    const entities: MatterRosterEntity[] = [];

    // 1. Detect Law Enforcement Officers: e.g. "Trooper Daniel Kelly", "Officer David Chen", "Deputy Sheriff Miller"
    const officerRegex = /\b(?:Trooper|Officer|Deputy|Sheriff|Corporal|Sergeant|Detective|Lieutenant|Sgt\.|Ofc\.|Trp\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
    let match: RegExpExecArray | null;
    while ((match = officerRegex.exec(text)) !== null) {
      const fullTitle = match[0];
      if (!entities.some((e) => e.name === fullTitle)) {
        entities.push({
          name: fullTitle,
          category: 'OFFICER_NAME',
          tokenPrefix: 'LAW_ENFORCEMENT_WITNESS',
        });
      }
    }

    // 2. Detect Judges: e.g. "Judge Mary Miles Teachout", "Honorable David A. Suntag"
    const judgeRegex = /\b(?:Judge|Honorable|Hon\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+|\s+[A-Z]\.?)*)\b/g;
    while ((match = judgeRegex.exec(text)) !== null) {
      const fullJudge = match[0];
      if (!entities.some((e) => e.name === fullJudge)) {
        entities.push({
          name: fullJudge,
          category: 'JUDGE_NAME',
          tokenPrefix: 'JUDGE_NAME',
        });
      }
    }

    return entities;
  }

  public isReady(): boolean {
    return this.isModelLoaded;
  }
}
