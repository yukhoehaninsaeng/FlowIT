import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { UserRole } from '@prisma/client'

export const POST = withAuth(async () => {
  // 실제 환경에서는 각 채널 어댑터를 호출해 주문을 수집합니다.
  // 어댑터 자격증명은 api_connections 테이블에서 조회합니다.
  return NextResponse.json({ data: { message: 'Sync triggered' } })
}, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER])
