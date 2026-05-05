import fs from 'fs';
import path from 'path';

export interface Office {
  id: string;
  name: string;
  emails: string[];
  createdAt: string;
}

export interface SendLog {
  id: string;
  officeId: string;
  officeName: string;
  email: string;       // stored as joined string for display
  sentAt: string;
  status: 'success' | 'failed';
  filesCount: number;
  error?: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface AppData {
  offices: Office[];
  logs: SendLog[];
  autoSendEnabled: boolean;
  emailTemplate: EmailTemplate;
}

const DATA_FILE = path.join(process.cwd(), 'lib', 'data.json');

const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: 'Biometrics Report – {{month}} | {{officeName}}',
  body: `Dear {{officeName}},

Please find attached the biometrics report(s) for the current period ({{month}}).

Kindly review the attached document(s) at your earliest convenience and ensure that all records are properly acknowledged.

If you have any questions or discrepancies to report, please do not hesitate to reach out to us directly.

Thank you for your continued cooperation.

Best regards,
{{senderName}}`,
};

const DEFAULT_DATA: AppData = {
  offices: [],
  logs: [],
  autoSendEnabled: true,
  emailTemplate: DEFAULT_TEMPLATE,
};

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function readData(): AppData {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      writeData(DEFAULT_DATA);
      return DEFAULT_DATA;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as any;

    // Migrate old email string → emails array
    if (parsed.offices) {
      parsed.offices = parsed.offices.map((o: any) => ({
        ...o,
        emails: o.emails ?? (o.email ? [o.email] : []),
      }));
    }

    return {
      ...DEFAULT_DATA,
      ...parsed,
      emailTemplate: parsed.emailTemplate ?? DEFAULT_TEMPLATE,
    };
  } catch {
    return DEFAULT_DATA;
  }
}

export function writeData(data: AppData): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getUploadDir(officeName?: string): string {
  const base = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  if (officeName) return path.join(base, officeName);
  return base;
}

export function getOfficePDFs(officeName: string): string[] {
  const dir = getUploadDir(officeName);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .map((f) => path.join(dir, f));
}