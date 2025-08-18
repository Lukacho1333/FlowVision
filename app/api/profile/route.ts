import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json(null);
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json(null);
  const profile = await prisma.businessProfile.findUnique({ where: { userId: user.id } });
  return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { industry, size, metrics } = await req.json();
  const profile = await prisma.businessProfile.upsert({
    where: { userId: user.id },
    update: { industry, size, metrics },
    create: { userId: user.id, organizationId: user.organizationId, industry, size, metrics },
  });
  await prisma.auditLog.create({
    data: { userId: user.id, action: 'PROFILE_SAVE', details: { industry, size } },
  });
  return NextResponse.json(profile);
}
