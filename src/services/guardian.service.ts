import { GoogleGenerativeAI } from "../utils/gemini";
import { env } from "../config/env";
import { SecurityEvent } from "../models/SecurityEvent";
import { websocketService } from "./websocket.service";

export type ThreatType = "injection" | "privilege_escalation" | "data_exfiltration";

export interface GuardianResult {
  approved: boolean;
  reason?: string;
  threat_type?: ThreatType;
  confidence: number;
}

const ABAC_BLOCKED_TOPICS: Record<number, string[]> = {
  1: ["salary","employee salary","compensation","incident response","incident escalation","internal contact","security team contact","admin access","soc dashboard","api usage","monthly cost","monthly usage","rate limit config","rate limiting config","guardian internals","scrubber internals","websocket port","database credential"],
  2: ["salary","employee salary","compensation","incident escalation","ceo contact","hr confidential","monthly api cost","database credential","credentials rotation","credential rotation","incident response protocol"],
  3: [],
};

const BLOCKED_SUBSTRINGS: string[] = [
  "secret credential","show me the secret","show the secret","give me the secret","reveal the secret",
  "what are the secrets","list the secrets","secret key","api key","private key","access token",
  "auth token","bearer token","jwt secret","master key","encryption key","webhook secret","client secret",
  "gemini key","openai key","mongodb password","database password","db password",
  "show me the password","give me the password","what is the password","list all passwords",
  "show me the credentials","give me the credentials","reveal credentials","dump credentials","show credentials",
  "show me the token","give me the token","what is the token","environment variable","env variable",
  "show me the env","print the env",
];

const UNIVERSAL_PATTERNS: { pattern: RegExp; threat_type: ThreatType; reason: string }[] = [
  { pattern: /\b(DROP\s+TABLE|DELETE\s+FROM|TRUNCATE\s+TABLE|UNION\s+SELECT|FROM\s+INFORMATION_SCHEMA)\b/gi, threat_type: "injection", reason: "SQL injection attempt detected." },
  { pattern: /\b(ignore\s+all\s+previous\s+instructions|you\s+are\s+now\s+a\s+different|DAN\s+mode|jailbreak|forget\s+all\s+previous\s+instructions|disregard\s+all\s+previous|reveal\s+your\s+system\s+prompt|reveal\s+the\s+system\s+prompt)\b/gi, threat_type: "injection", reason: "Prompt injection attempt detected." },
  { pattern: /\b(grant\s+me\s+admin|elevate\s+my\s+access|sudo\s+access|root\s+access|bypass\s+clearance|become\s+admin|give\s+me\s+clearance\s+level\s+3)\b/gi, threat_type: "privilege_escalation", reason: "Privilege escalation attempt detected." },
  { pattern: /\b(cat\s+\/etc\/passwd|dump\s+database|export\s+all\s+data)\b/gi, threat_type: "data_exfiltration", reason: "System probing attempt detected." },
];

const NON_ADMIN_PATTERNS: { pattern: RegExp; threat_type: ThreatType; reason: string }[] = [
  { pattern: /\b(show\s+all\s+documents|access\s+all\s+(files|documents|data)|list\s+all\s+(employees|users|admins)|give\s+me\s+all\s+(data|documents|files))\b/gi, threat_type: "data_exfiltration", reason: "Unauthorized bulk data access. Admin clearance required." },
];

export class GuardianService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async analyzePrompt(prompt: string, clearanceLevel: number, userId?: string, role?: string): Promise<GuardianResult> {
    try {
      const isAdmin = clearanceLevel === 3 || role === "security_admin";
      const lower = prompt.toLowerCase();

      for (const kw of BLOCKED_SUBSTRINGS) {
        if (lower.includes(kw)) {
          const result: GuardianResult = { approved: false, reason: "Credential or sensitive data extraction attempt detected.", threat_type: "data_exfiltration", confidence: 1.0 };
          await this.logBlockedPrompt(prompt, result, userId);
          return result;
        }
      }

      for (const { pattern, threat_type, reason } of UNIVERSAL_PATTERNS) {
        if (new RegExp(pattern.source, pattern.flags).test(prompt)) {
          const result: GuardianResult = { approved: false, reason, threat_type, confidence: 1.0 };
          await this.logBlockedPrompt(prompt, result, userId);
          return result;
        }
      }

      if (!isAdmin) {
        for (const { pattern, threat_type, reason } of NON_ADMIN_PATTERNS) {
          if (new RegExp(pattern.source, pattern.flags).test(prompt)) {
            const result: GuardianResult = { approved: false, reason, threat_type, confidence: 1.0 };
            await this.logBlockedPrompt(prompt, result, userId);
            return result;
          }
        }
      }

      const blockedTopics = ABAC_BLOCKED_TOPICS[clearanceLevel] || [];
      for (const topic of blockedTopics) {
        const words = topic.toLowerCase().split(" ");
        if (words.every((w: string) => lower.includes(w))) {
          const result: GuardianResult = { approved: false, reason: `Access denied. Your clearance level (${clearanceLevel}) does not permit access to this information. Higher clearance required.`, threat_type: "privilege_escalation", confidence: 1.0 };
          await this.logBlockedPrompt(prompt, result, userId);
          return result;
        }
      }

      return { approved: true, confidence: 0.0 };

    } catch (error) {
      console.error("Guardian analysis failed:", error);
      return { approved: false, reason: "Security analysis failed. Request blocked.", confidence: 1.0 };
    }
  }

  private async logBlockedPrompt(prompt: string, result: GuardianResult, userId?: string): Promise<void> {
    try {
      const event = await SecurityEvent.create({ type: "blocked_attack", timestamp: new Date(), user_id: userId, details: { prompt: prompt.substring(0, 500), reason: result.reason, threat_type: result.threat_type }, severity: result.threat_type === "injection" ? "critical" : "high" });
      websocketService.triggerEvent(event as any);
    } catch (error) {
      console.error("Failed to log blocked prompt:", error);
    }
  }
}

export const guardianService = new GuardianService();