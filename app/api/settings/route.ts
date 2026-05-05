import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/store';

export async function GET() {
  const data = readData();
  return NextResponse.json({
    autoSendEnabled: data.autoSendEnabled,
    logs: data.logs,
    emailTemplate: data.emailTemplate,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const data = readData();

  if (typeof body.autoSendEnabled === 'boolean') data.autoSendEnabled = body.autoSendEnabled;
  if (body.emailTemplate) data.emailTemplate = { ...data.emailTemplate, ...body.emailTemplate };

  writeData(data);
  return NextResponse.json({
    autoSendEnabled: data.autoSendEnabled,
    emailTemplate: data.emailTemplate,
  });
}
