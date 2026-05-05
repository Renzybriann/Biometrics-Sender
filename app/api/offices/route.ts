import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData, Office } from '@/lib/store';
import fs from 'fs';
import path from 'path';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// GET /api/offices
export async function GET() {
  const data = readData();
  return NextResponse.json(data.offices);
}

// POST /api/offices - add new office
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, emails } = body;

  if (!name || !emails || !Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: 'Name and at least one email are required' }, { status: 400 });
  }

  const data = readData();

  const exists = data.offices.find(
    (o) => o.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    return NextResponse.json({ error: 'Office name already exists' }, { status: 400 });
  }

  const newOffice: Office = {
    id: generateId(),
    name: name.trim(),
    emails: emails.map((e: string) => e.trim()).filter(Boolean),
    createdAt: new Date().toISOString(),
  };

  // Create upload folder for office
  const uploadDir = path.join(process.cwd(), 'uploads', newOffice.name);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  data.offices.push(newOffice);
  writeData(data);

  return NextResponse.json(newOffice, { status: 201 });
}

// PUT /api/offices - update office
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, emails } = body;

  if (!id || !name || !emails || !Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: 'id, name and at least one email are required' }, { status: 400 });
  }

  const data = readData();
  const index = data.offices.findIndex((o) => o.id === id);
  if (index === -1) {
    return NextResponse.json({ error: 'Office not found' }, { status: 404 });
  }

  const oldName = data.offices[index].name;
  data.offices[index] = {
    ...data.offices[index],
    name: name.trim(),
    emails: emails.map((e: string) => e.trim()).filter(Boolean),
  };

  // Rename upload folder if name changed
  if (oldName !== name.trim()) {
    const oldDir = path.join(process.cwd(), 'uploads', oldName);
    const newDir = path.join(process.cwd(), 'uploads', name.trim());
    if (fs.existsSync(oldDir)) fs.renameSync(oldDir, newDir);
  }

  writeData(data);
  return NextResponse.json(data.offices[index]);
}

// DELETE /api/offices
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const data = readData();
  const office = data.offices.find((o) => o.id === id);
  if (!office) {
    return NextResponse.json({ error: 'Office not found' }, { status: 404 });
  }

  data.offices = data.offices.filter((o) => o.id !== id);
  writeData(data);

  return NextResponse.json({ success: true });
}
