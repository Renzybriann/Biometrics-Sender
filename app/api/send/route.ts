import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData, getOfficePDFs } from '@/lib/store';
import { sendBiometricsEmail, verifyConnection } from '@/lib/mailer'; // ← add verifyConnection here

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// POST /api/send  — body: { officeId?: string } (omit to send to all)
export async function POST(req: NextRequest) {
  console.log('POST /api/send hit'); // ← add this

  const ok = await verifyConnection();
  console.log('SMTP verify result:', ok); // ← add this

  if (!ok) {
    return NextResponse.json({ error: 'SMTP connection failed' }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  const { officeId } = body;

  const data = readData();
const template = data.emailTemplate ?? {
  subject: 'Biometrics Report – {{month}} | {{officeName}}',
  body: 'Dear {{officeName}},\n\nPlease find attached the biometrics report(s) for the current period ({{month}}).\n\nThank you for your continued cooperation.\n\nBest regards,\n{{senderName}}',
};
const targets = officeId ? data.offices.filter((o) => o.id === officeId) : data.offices;

  if (targets.length === 0) {
    return NextResponse.json({ error: 'No offices found' }, { status: 404 });
  }

  let sent = 0;
  let failed = 0;
  const results: { office: string; status: string; error?: string }[] = [];

  for (const office of targets) {
    const pdfPaths = getOfficePDFs(office.name);

    if (pdfPaths.length === 0) {
      const log = {
        id: generateId(),
        officeId: office.id,
        officeName: office.name,
        email: office.emails.join(', '),
        sentAt: new Date().toISOString(),
        status: 'failed' as const,
        filesCount: 0,
        error: 'No PDF files uploaded for this office',
      };
      data.logs.unshift(log);
      results.push({ office: office.name, status: 'failed', error: log.error });
      failed++;
      continue;
    }

    try {
      await sendBiometricsEmail({
        to: office.emails,
        officeName: office.name,
        pdfPaths,
        template,
      });   

      data.logs.unshift({
        id: generateId(),
        officeId: office.id,
        officeName: office.name,
        email: office.emails.join(', '),
        sentAt: new Date().toISOString(),
        status: 'success',
        filesCount: pdfPaths.length,
      });
      results.push({ office: office.name, status: 'success' });
      sent++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      data.logs.unshift({
        id: generateId(),
        officeId: office.id,
        officeName: office.name,
        email: office.emails.join(', '),
        sentAt: new Date().toISOString(),
        status: 'failed',
        filesCount: pdfPaths.length,
        error: errorMsg,
      });
      results.push({ office: office.name, status: 'failed', error: errorMsg });
      failed++;
    }
  }

  data.logs = data.logs.slice(0, 100);
  writeData(data);

  return NextResponse.json({ sent, failed, results });
}
