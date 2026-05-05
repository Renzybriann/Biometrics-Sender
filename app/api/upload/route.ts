import { NextRequest, NextResponse } from 'next/server';
import { readData, getUploadDir } from '@/lib/store';
import fs from 'fs';
import path from 'path';

// GET /api/upload?officeId=xxx  — list PDFs for an office
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const officeId = searchParams.get('officeId');

  if (!officeId) {
    return NextResponse.json({ error: 'officeId is required' }, { status: 400 });
  }

  const data = readData();
  const office = data.offices.find((o) => o.id === officeId);
  if (!office) {
    return NextResponse.json({ error: 'Office not found' }, { status: 404 });
  }

  const dir = getUploadDir(office.name);
  if (!fs.existsSync(dir)) return NextResponse.json({ files: [] });

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.pdf'))
    .map((f) => ({
      name: f,
      size: fs.statSync(path.join(dir, f)).size,
      uploadedAt: fs.statSync(path.join(dir, f)).mtime.toISOString(),
    }));

  return NextResponse.json({ files });
}

// POST /api/upload  — upload PDFs for an office (multipart/form-data)
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const officeId = formData.get('officeId') as string;
  const files = formData.getAll('files') as File[];

  if (!officeId || files.length === 0) {
    return NextResponse.json({ error: 'officeId and files are required' }, { status: 400 });
  }

  const data = readData();
  const office = data.offices.find((o) => o.id === officeId);
  if (!office) {
    return NextResponse.json({ error: 'Office not found' }, { status: 404 });
  }

  const uploadDir = getUploadDir(office.name);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const saved: string[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.pdf')) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const dest = path.join(uploadDir, file.name);
    fs.writeFileSync(dest, buffer);
    saved.push(file.name);
  }

  return NextResponse.json({ saved, count: saved.length });
}

// DELETE /api/upload?officeId=xxx&file=yyy.pdf
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const officeId = searchParams.get('officeId');
  const fileName = searchParams.get('file');

  if (!officeId || !fileName) {
    return NextResponse.json({ error: 'officeId and file are required' }, { status: 400 });
  }

  const data = readData();
  const office = data.offices.find((o) => o.id === officeId);
  if (!office) {
    return NextResponse.json({ error: 'Office not found' }, { status: 404 });
  }

  const filePath = path.join(getUploadDir(office.name), fileName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  return NextResponse.json({ success: true });
}
