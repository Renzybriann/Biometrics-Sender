import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_FILE = path.join(process.cwd(), '.env.local');

function readEnvFile(): Record<string, string> {
  if (!fs.existsSync(ENV_FILE)) return {};
  const lines = fs.readFileSync(ENV_FILE, 'utf-8').split('\n');
  const result: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

function writeEnvFile(vars: Record<string, string>): void {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n');
}

// GET — return current config (masked password)
export async function GET() {
  const env = readEnvFile();
  return NextResponse.json({
    gmailUser: env.GMAIL_USER || '',
    gmailFromName: env.GMAIL_FROM_NAME || '',
    hasPassword: !!env.GMAIL_APP_PASSWORD,
  });
}

// POST — update credentials
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { gmailUser, gmailAppPassword, gmailFromName } = body;

  if (!gmailUser) return NextResponse.json({ error: 'Gmail address is required' }, { status: 400 });

  const env = readEnvFile();
  env.GMAIL_USER = gmailUser.trim();
  if (gmailFromName) env.GMAIL_FROM_NAME = gmailFromName.trim();
  if (gmailAppPassword) env.GMAIL_APP_PASSWORD = gmailAppPassword.trim();

  writeEnvFile(env);

  // Update process.env for current session
  process.env.GMAIL_USER = env.GMAIL_USER;
  if (gmailFromName) process.env.GMAIL_FROM_NAME = env.GMAIL_FROM_NAME;
  if (gmailAppPassword) process.env.GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD;

  return NextResponse.json({ success: true });
}
