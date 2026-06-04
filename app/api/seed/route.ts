import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { MODULE_REGISTRY } from '@/lib/modules/registry'

// POST /api/seed  — admin 전용, 테스트 데이터 일괄 생성
export const POST = withAuth(async () => {
  // ── 기존 데이터 정리 (순서 중요: FK 역순) ──────────────────
  await prisma.biCache.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.journeyEnrollment.deleteMany()
  await prisma.journey.deleteMany()
  await prisma.campaignSend.deleteMany()
  await prisma.influencerCampaign.deleteMany()
  await prisma.campaign.deleteMany()
  await prisma.influencer.deleteMany()
  await prisma.vocReview.deleteMany()
  await prisma.demandForecast.deleteMany()
  await prisma.returnItem.deleteMany()
  await prisma.return.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.warehouseLocation.deleteMany()
  await prisma.purchaseOrderItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.settlement.deleteMany()
  await prisma.receivablePayment.deleteMany()
  await prisma.receivable.deleteMany()
  await prisma.quote.deleteMany()
  await prisma.contactLog.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.accountProduct.deleteMany()
  await prisma.account.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.customerEvent.deleteMany()
  await prisma.customerIdentity.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.skuBundle.deleteMany()
  await prisma.skuAlias.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.skuMaster.deleteMany()
  await prisma.workspaceModule.deleteMany()
  await prisma.workspace.deleteMany()

  // ── 1. Workspace & 모든 모듈 활성화 ──────────────────────
  const workspace = await prisma.workspace.create({
    data: { name: 'FlowIT Demo', slug: 'flowit-demo', industry: 'logistics', plan: 'pro' }
  })
  await Promise.all(
    MODULE_REGISTRY.map((def, idx) =>
      prisma.workspaceModule.create({
        data: { workspaceId: workspace.id, moduleKey: def.key, isEnabled: true, displayOrder: idx }
      })
    )
  )

  // ── 2. 관리자 계정 생성 (이미 있으면 재사용) ─────────────
  let adminUser = await prisma.user.findFirst({ where: { email: 'admin@flowit.com' } })
  if (!adminUser) {
    const hash = await bcrypt.hash('admin1234', 10)
    adminUser = await prisma.user.create({
      data: { email: 'admin@flowit.com', name: '관리자', passwordHash: hash, role: 'super_admin', isActive: true }
    })
  }

  // ── 3. SKU 마스터 (화장품 30종) ───────────────────────────
  const skuData = [
    // 스킨케어
    { skuCode: 'SK-001', name: '수분 에센스 50ml', category: '스킨케어', subCategory: '에센스', unitCost: 12000, sellingPrice: 38000, unit: 'EA' },
    { skuCode: 'SK-002', name: '레티놀 세럼 30ml', category: '스킨케어', subCategory: '세럼', unitCost: 18000, sellingPrice: 62000, unit: 'EA' },
    { skuCode: 'SK-003', name: '히알루론산 토너 150ml', category: '스킨케어', subCategory: '토너', unitCost: 8000, sellingPrice: 28000, unit: 'EA' },
    { skuCode: 'SK-004', name: '나이아신아마이드 크림 50g', category: '스킨케어', subCategory: '크림', unitCost: 14000, sellingPrice: 45000, unit: 'EA' },
    { skuCode: 'SK-005', name: '선크림 SPF50+ 50ml', category: '스킨케어', subCategory: '선케어', unitCost: 9000, sellingPrice: 32000, unit: 'EA' },
    { skuCode: 'SK-006', name: '클렌징 폼 150ml', category: '스킨케어', subCategory: '클렌저', unitCost: 5000, sellingPrice: 18000, unit: 'EA' },
    { skuCode: 'SK-007', name: '앰플 세트 10ml×5', category: '스킨케어', subCategory: '앰플', unitCost: 25000, sellingPrice: 78000, unit: 'SET' },
    { skuCode: 'SK-008', name: '아이크림 30ml', category: '스킨케어', subCategory: '크림', unitCost: 16000, sellingPrice: 55000, unit: 'EA' },
    // 마스크팩
    { skuCode: 'MK-001', name: '수분 시트 마스크 25ml×10', category: '마스크팩', subCategory: '시트마스크', unitCost: 8000, sellingPrice: 25000, unit: 'BOX' },
    { skuCode: 'MK-002', name: '비타민C 마스크 25ml×5', category: '마스크팩', subCategory: '시트마스크', unitCost: 5500, sellingPrice: 18000, unit: 'BOX' },
    { skuCode: 'MK-003', name: '블랙헤드 코팩 60매', category: '마스크팩', subCategory: '코팩', unitCost: 6000, sellingPrice: 19800, unit: 'BOX' },
    { skuCode: 'MK-004', name: '슬리핑 마스크 100ml', category: '마스크팩', subCategory: '수면팩', unitCost: 11000, sellingPrice: 35000, unit: 'EA' },
    // 색조화장품
    { skuCode: 'CO-001', name: '쿠션 파운데이션 15g', category: '색조', subCategory: '베이스', unitCost: 13000, sellingPrice: 42000, unit: 'EA' },
    { skuCode: 'CO-002', name: '틴트 립밤 3.5g', category: '색조', subCategory: '립', unitCost: 4500, sellingPrice: 15000, unit: 'EA' },
    { skuCode: 'CO-003', name: '아이섀도 팔레트 12색', category: '색조', subCategory: '아이', unitCost: 15000, sellingPrice: 48000, unit: 'EA' },
    { skuCode: 'CO-004', name: '컨투어링 스틱 8g', category: '색조', subCategory: '베이스', unitCost: 7000, sellingPrice: 22000, unit: 'EA' },
    // 헤어케어
    { skuCode: 'HR-001', name: '손상모발 샴푸 500ml', category: '헤어케어', subCategory: '샴푸', unitCost: 7500, sellingPrice: 24000, unit: 'EA' },
    { skuCode: 'HR-002', name: '케라틴 트리트먼트 200ml', category: '헤어케어', subCategory: '트리트먼트', unitCost: 9000, sellingPrice: 32000, unit: 'EA' },
    { skuCode: 'HR-003', name: '두피 앰플 150ml', category: '헤어케어', subCategory: '두피케어', unitCost: 12000, sellingPrice: 38000, unit: 'EA' },
    // 바디케어
    { skuCode: 'BD-001', name: '보습 바디로션 300ml', category: '바디케어', subCategory: '바디로션', unitCost: 6000, sellingPrice: 20000, unit: 'EA' },
    { skuCode: 'BD-002', name: '스크럽 바디워시 300ml', category: '바디케어', subCategory: '바디워시', unitCost: 5500, sellingPrice: 18000, unit: 'EA' },
    { skuCode: 'BD-003', name: '핸드크림 50ml×3', category: '바디케어', subCategory: '핸드케어', unitCost: 7000, sellingPrice: 22000, unit: 'SET' },
    // 기능성
    { skuCode: 'FN-001', name: '미백 기능성 크림 50g', category: '기능성', subCategory: '미백', unitCost: 20000, sellingPrice: 65000, unit: 'EA' },
    { skuCode: 'FN-002', name: '주름개선 앰플 30ml', category: '기능성', subCategory: '주름개선', unitCost: 22000, sellingPrice: 72000, unit: 'EA' },
    { skuCode: 'FN-003', name: '자외선차단 기능성 선세럼 40ml', category: '기능성', subCategory: '선케어', unitCost: 16000, sellingPrice: 52000, unit: 'EA' },
    // 세트상품
    { skuCode: 'ST-001', name: '봄맞이 스킨케어 세트', category: '세트', subCategory: '시즌세트', unitCost: 45000, sellingPrice: 138000, unit: 'SET', isBundle: true },
    { skuCode: 'ST-002', name: '여름 선케어 세트', category: '세트', subCategory: '시즌세트', unitCost: 28000, sellingPrice: 88000, unit: 'SET', isBundle: true },
    { skuCode: 'ST-003', name: '기초 스킨케어 입문 세트', category: '세트', subCategory: '입문세트', unitCost: 35000, sellingPrice: 108000, unit: 'SET', isBundle: true },
    { skuCode: 'ST-004', name: 'VIP 프리미엄 케어 세트', category: '세트', subCategory: '프리미엄', unitCost: 80000, sellingPrice: 248000, unit: 'SET', isBundle: true },
    { skuCode: 'ST-005', name: '미니어처 트라이얼 키트', category: '세트', subCategory: '트라이얼', unitCost: 15000, sellingPrice: 45000, unit: 'SET', isBundle: true },
  ]

  const now = new Date()
  const skus = await Promise.all(skuData.map((s, i) =>
    prisma.skuMaster.create({
      data: {
        ...s,
        isBundle: s.isBundle ?? false,
        isActive: true,
        lotExpiry: i < 10
          ? new Date(now.getTime() + (i * 20 + 30) * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() + (i * 30 + 180) * 24 * 60 * 60 * 1000),
        ingredients: { main: ['정제수', '글리세린', '부틸렌글라이콜'] }
      }
    })
  ))

  // ── 4. 재고 (채널별) ──────────────────────────────────────
  const channels = ['naver', 'coupang', 'kakao', 'direct', 'oliveyoung']
  for (const sku of skus) {
    for (const ch of channels.slice(0, 3)) {
      const base = Math.floor(Math.random() * 800) + 50
      await prisma.inventory.create({
        data: { skuMasterId: sku.id, channel: ch, qtyAvailable: base, qtyReserved: Math.floor(base * 0.1), reorderPoint: 30 }
      })
    }
  }

  // ── 5. 창고 로케이션 ──────────────────────────────────────
  const locs = await Promise.all([
    { code: 'A-01', name: 'A동 1번 선반', zone: 'A', capacity: 500 },
    { code: 'A-02', name: 'A동 2번 선반', zone: 'A', capacity: 500 },
    { code: 'B-01', name: 'B동 1번 선반', zone: 'B', capacity: 1000 },
    { code: 'C-01', name: '냉장 보관 구역', zone: 'C', capacity: 200 },
    { code: 'D-01', name: '반품 보관 구역', zone: 'D', capacity: 300 },
  ].map(l => prisma.warehouseLocation.create({ data: { ...l, isActive: true } })))

  // ── 6. 고객 100명 ─────────────────────────────────────────
  const segments = ['vip', 'regular', 'new', 'churn_risk', 'dormant']
  const skinTypes = ['건성', '지성', '복합성', '민감성', '정상']
  const customerNames = [
    '김민지', '이서연', '박지현', '최수빈', '정유진', '강민서', '윤지은', '조하은', '장수연', '임나연',
    '한지수', '신예린', '오지안', '권서영', '황민아', '송지우', '류수빈', '안예은', '유하은', '남지현',
    '김태영', '이준혁', '박성민', '최도현', '정재원', '강지호', '윤민준', '조현우', '장서준', '임동현',
    '한예진', '신수현', '오민서', '권지원', '황수연', '송민지', '류예린', '안지수', '유나연', '남서윤',
    '김지영', '이민수', '박서현', '최지우', '정민아', '강예진', '윤수현', '조민서', '장지원', '임수연',
    '한도현', '신준혁', '오서준', '권태영', '황성민', '송재원', '류지호', '안민준', '유현우', '남서준',
    '김수아', '이하은', '박민지', '최서연', '정지현', '강수빈', '윤유진', '조민서', '장하은', '임수연',
    '한나연', '신지수', '오예린', '권지안', '황서영', '송민아', '류지우', '안수빈', '유예은', '남하은',
    '김예린', '이지수', '박하은', '최민지', '정서연', '강지현', '윤수빈', '조유진', '장민서', '임지은',
    '한하은', '신수연', '오나연', '권지수', '황예린', '송지안', '류서영', '안민아', '유지우', '남수빈',
  ]

  const customers = await Promise.all(customerNames.map((name, i) => {
    const seg = i < 10 ? 'vip' : i < 30 ? 'regular' : i < 60 ? 'new' : i < 80 ? 'churn_risk' : 'dormant'
    const ltv = seg === 'vip' ? Math.floor(Math.random() * 2000000) + 500000
      : seg === 'regular' ? Math.floor(Math.random() * 500000) + 100000
      : Math.floor(Math.random() * 100000) + 10000
    return prisma.customer.create({
      data: {
        name,
        email: `user${i + 1}@example.com`,
        phone: `010-${String(1000 + i).padStart(4, '0')}-${String(5000 + i).padStart(4, '0')}`,
        gender: i % 3 === 0 ? '남' : '여',
        birthYear: 1980 + (i % 30),
        skinType: skinTypes[i % skinTypes.length],
        segment: seg,
        ltv,
        isActive: i < 80,
        rfmScore: { r: Math.floor(Math.random() * 5) + 1, f: Math.floor(Math.random() * 5) + 1, m: Math.floor(Math.random() * 5) + 1 }
      }
    })
  }))

  // ── 7. 주문 (12개월 데이터) ───────────────────────────────
  const orderStatuses = ['PAID', 'SHIPPED', 'DELIVERED']
  const orderChannels = ['naver', 'coupang', 'kakao', 'direct', 'oliveyoung']
  const allOrders: { id: string; customerId: string }[] = []

  for (let month = 11; month >= 0; month--) {
    const ordersThisMonth = 20 + Math.floor(Math.random() * 30)
    for (let i = 0; i < ordersThisMonth; i++) {
      const orderDate = new Date(now.getFullYear(), now.getMonth() - month, Math.floor(Math.random() * 28) + 1)
      const customer = customers[Math.floor(Math.random() * customers.length)]
      const channel = orderChannels[Math.floor(Math.random() * orderChannels.length)]
      const numItems = Math.floor(Math.random() * 3) + 1
      const selectedSkus = [...skus].sort(() => 0.5 - Math.random()).slice(0, numItems)
      const totalAmount = selectedSkus.reduce((s, sku) => s + (sku.sellingPrice?.toNumber() ?? 0), 0)

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          channel,
          channelOrderId: `CH-${channel.toUpperCase()}-${Date.now()}-${i}`,
          totalAmount,
          discountAmount: Math.floor(totalAmount * 0.05),
          status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
          orderedAt: orderDate,
        }
      })
      allOrders.push({ id: order.id, customerId: customer.id })

      await Promise.all(selectedSkus.map(sku =>
        prisma.orderItem.create({
          data: {
            orderId: order.id,
            skuMasterId: sku.id,
            qty: Math.floor(Math.random() * 3) + 1,
            unitPrice: sku.sellingPrice ?? 0,
            lotNumber: `LOT-${sku.skuCode}-${orderDate.getFullYear()}${String(orderDate.getMonth() + 1).padStart(2, '0')}`,
          }
        })
      ))
    }
  }

  // ── 8. 거래처 (B2B) ───────────────────────────────────────
  const accountData = [
    { name: '(주)뷰티플러스', type: 'partner', industry: '유통', contactName: '김영수', contactPhone: '02-1234-5678', contactEmail: 'ys.kim@beautyplus.co.kr', paymentTerms: '월말정산', creditLimit: 50000000 },
    { name: '올리브영 강남점', type: 'retailer', industry: '드럭스토어', contactName: '이미래', contactPhone: '02-2345-6789', contactEmail: 'mr.lee@oliveyoung.com', paymentTerms: '60일', creditLimit: 30000000 },
    { name: '롯데百 본점', type: 'retailer', industry: '백화점', contactName: '박준호', contactPhone: '02-3456-7890', contactEmail: 'jh.park@lotte.com', paymentTerms: '90일', creditLimit: 100000000 },
    { name: '신세계 강남', type: 'retailer', industry: '백화점', contactName: '최서은', contactPhone: '02-4567-8901', contactEmail: 'se.choi@shinsegae.com', paymentTerms: '90일', creditLimit: 80000000 },
    { name: '홈쇼핑 GS SHOP', type: 'partner', industry: '홈쇼핑', contactName: '정다운', contactPhone: '02-5678-9012', contactEmail: 'dw.jeong@gsshop.com', paymentTerms: '30일', creditLimit: 200000000 },
    { name: '쿠팡 직접거래', type: 'partner', industry: 'e커머스', contactName: '강민호', contactPhone: '02-6789-0123', contactEmail: 'mh.kang@coupang.com', paymentTerms: '15일', creditLimit: 150000000 },
    { name: '무신사 뷰티', type: 'partner', industry: 'e커머스', contactName: '윤지훈', contactPhone: '02-7890-1234', contactEmail: 'jh.yun@musinsa.com', paymentTerms: '30일', creditLimit: 50000000 },
    { name: '(주)코스닥유통', type: 'distributor', industry: '도매유통', contactName: '조형진', contactPhone: '031-234-5678', contactEmail: 'hj.jo@kosdaqdist.co.kr', paymentTerms: '월말정산', creditLimit: 70000000 },
    { name: '세종 드럭스토어', type: 'retailer', industry: '드럭스토어', contactName: '장미래', contactPhone: '044-345-6789', contactEmail: 'mr.jang@sejong-drug.co.kr', paymentTerms: '30일', creditLimit: 20000000 },
    { name: '부산뷰티아울렛', type: 'retailer', industry: '아울렛', contactName: '임소연', contactPhone: '051-456-7890', contactEmail: 'sy.im@busanbeauty.co.kr', paymentTerms: '30일', creditLimit: 25000000 },
    { name: '(주)동방코스메틱', type: 'distributor', industry: '도매', contactName: '한진수', contactPhone: '02-567-8901', contactEmail: 'js.han@dongbang.co.kr', paymentTerms: '월말정산', creditLimit: 40000000 },
    { name: '제주면세점', type: 'retailer', industry: '면세점', contactName: '신유리', contactPhone: '064-678-9012', contactEmail: 'yr.shin@jejudfs.co.kr', paymentTerms: '60일', creditLimit: 60000000 },
  ]

  const accounts = await Promise.all(accountData.map(a => prisma.account.create({ data: a })))

  // ── 9. 딜 (영업 파이프라인) ──────────────────────────────
  const dealStages = ['LEAD', 'MEETING', 'QUOTE', 'REVIEW', 'CLOSED']
  const dealTitles = [
    '봄시즌 기획전 입점 제안', '정기 납품 계약 갱신', '신제품 런칭 파트너십', '온라인 독점 공급 협의',
    '백화점 MD 미팅', '홈쇼핑 방영 제안', '드럭스토어 확장 입점', '해외수출 파트너 검토',
    '프리미엄 라인 콜라보', 'PB 상품 개발 제안', '물류 아웃소싱 계약', '마케팅 협업 MOU',
    '하반기 물량 계약', '신규 브랜드 런칭', '연말 기획세트 납품',
  ]

  await Promise.all(dealTitles.map((title, i) => {
    const stage = dealStages[Math.floor(i / 3)]
    const amount = (Math.floor(Math.random() * 50) + 5) * 1000000
    const daysAgo = Math.floor(Math.random() * 90)
    return prisma.deal.create({
      data: {
        accountId: accounts[i % accounts.length].id,
        title,
        stage,
        amount,
        probability: stage === 'LEAD' ? 20 : stage === 'MEETING' ? 40 : stage === 'QUOTE' ? 60 : stage === 'REVIEW' ? 80 : 100,
        assigneeId: adminUser!.id,
        expectedClose: new Date(now.getTime() + (30 - daysAgo) * 24 * 60 * 60 * 1000),
        stageChangedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
        notes: `${title} 관련 진행 사항을 추적합니다.`,
      }
    })
  }))

  // ── 10. 상담 이력 ─────────────────────────────────────────
  const contactTypes = ['email', 'call', 'meeting', 'manual']
  const contactSubjects = ['초도 발주 협의', '가격 조건 확인', '계약서 검토', '샘플 발송 확인', '불만사항 처리', '정산 확인', 'MD 미팅 결과 공유']

  const deals = await prisma.deal.findMany({ take: 15 })
  for (let i = 0; i < 50; i++) {
    const deal = deals[i % deals.length]
    const daysAgo = Math.floor(Math.random() * 60)
    await prisma.contactLog.create({
      data: {
        accountId: deal.accountId,
        dealId: deal.id,
        type: contactTypes[i % contactTypes.length],
        direction: i % 2 === 0 ? 'outbound' : 'inbound',
        subject: contactSubjects[i % contactSubjects.length],
        summary: `${contactSubjects[i % contactSubjects.length]}에 대해 논의하였으며, 다음 단계를 진행하기로 합의하였습니다.`,
        occurredAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
        createdById: adminUser!.id,
      }
    })
  }

  // ── 11. 견적서 ────────────────────────────────────────────
  const quoteStatuses = ['draft', 'sent', 'approved', 'rejected']
  for (let i = 0; i < 20; i++) {
    const account = accounts[i % accounts.length]
    const deal = deals[i % deals.length]
    const subtotal = (Math.floor(Math.random() * 100) + 10) * 100000
    const taxAmount = Math.floor(subtotal * 0.1)
    const quoteItems = skus.slice(i % 5, (i % 5) + 3).map(sku => ({
      skuId: sku.id, skuCode: sku.skuCode, name: sku.name,
      qty: Math.floor(Math.random() * 100) + 10,
      unitPrice: Number(sku.sellingPrice),
      amount: (Math.floor(Math.random() * 100) + 10) * Number(sku.sellingPrice)
    }))
    await prisma.quote.create({
      data: {
        quoteNo: `QT-2024-${String(i + 1).padStart(4, '0')}`,
        accountId: account.id,
        dealId: deal.id,
        status: quoteStatuses[i % quoteStatuses.length],
        title: `${account.name} 납품 견적서`,
        items: quoteItems,
        subtotal,
        taxRate: 10,
        taxAmount,
        totalAmount: subtotal + taxAmount,
        validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        notes: '본 견적은 발행일로부터 30일간 유효합니다.',
        createdById: adminUser!.id,
      }
    })
  }

  // ── 12. 미수금 ────────────────────────────────────────────
  const invoiceStatuses = ['unpaid', 'partial', 'paid', 'overdue']
  for (let i = 0; i < 20; i++) {
    const account = accounts[i % accounts.length]
    const amount = (Math.floor(Math.random() * 50) + 5) * 1000000
    const status = invoiceStatuses[i % invoiceStatuses.length]
    const paidAmount = status === 'paid' ? amount : status === 'partial' ? Math.floor(amount * 0.5) : 0
    const rec = await prisma.receivable.create({
      data: {
        invoiceNo: `INV-2024-${String(i + 1).padStart(4, '0')}`,
        accountId: account.id,
        amount,
        paidAmount,
        dueDate: new Date(now.getTime() + (i - 10) * 7 * 24 * 60 * 60 * 1000),
        status,
        createdById: adminUser!.id,
      }
    })
    if (paidAmount > 0) {
      await prisma.receivablePayment.create({
        data: {
          receivableId: rec.id,
          amount: paidAmount,
          method: '계좌이체',
          bankRef: `REF-${Date.now()}-${i}`,
          paidAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          createdById: adminUser!.id,
        }
      })
    }
  }

  // ── 13. 거래처 정산 (6개월치) ─────────────────────────────
  const partnerNames = ['(주)뷰티플러스', '올리브영', '쿠팡 직거래', 'GS홈쇼핑', '무신사 뷰티']
  const settlementStatuses = ['draft', 'confirmed', 'paid']
  for (let month = 5; month >= 0; month--) {
    const d = new Date(now.getFullYear(), now.getMonth() - month, 1)
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    for (let p = 0; p < partnerNames.length; p++) {
      const totalAmount = (Math.floor(Math.random() * 200) + 50) * 100000
      const status = month > 2 ? 'paid' : month > 0 ? 'confirmed' : 'draft'
      await prisma.settlement.create({
        data: {
          partnerName: partnerNames[p],
          period,
          totalAmount,
          status,
          dueDate: new Date(d.getFullYear(), d.getMonth() + 1, 10),
          paidAt: status === 'paid' ? new Date(d.getFullYear(), d.getMonth() + 1, 15) : null,
          notes: `${period} 월 ${partnerNames[p]} 정산`,
          createdById: adminUser!.id,
        }
      })
    }
  }

  // ── 14. 발주서 ────────────────────────────────────────────
  const poStatuses = ['draft', 'confirmed', 'received', 'partial']
  const poTypes = ['purchase', 'sale']
  for (let i = 0; i < 20; i++) {
    const po = await prisma.purchaseOrder.create({
      data: {
        orderNo: `PO-2024-${String(i + 1).padStart(4, '0')}`,
        type: poTypes[i % 2],
        partnerName: accountData[i % accountData.length].name,
        status: poStatuses[i % poStatuses.length],
        totalAmount: (Math.floor(Math.random() * 50) + 10) * 100000,
        dueDate: new Date(now.getTime() + (i - 5) * 7 * 24 * 60 * 60 * 1000),
        issuedAt: new Date(now.getTime() - i * 3 * 24 * 60 * 60 * 1000),
        createdById: adminUser!.id,
      }
    })
    const selectedSkus = skus.slice(i % 5, (i % 5) + 2)
    await Promise.all(selectedSkus.map(sku =>
      prisma.purchaseOrderItem.create({
        data: {
          orderId: po.id,
          skuMasterId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.name,
          qty: Math.floor(Math.random() * 500) + 50,
          unitPrice: sku.unitCost ?? 0,
          lotNumber: `LOT-${sku.skuCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
        }
      })
    ))
  }

  // ── 15. 입출고 이력 ──────────────────────────────────────
  const mvTypes = ['in', 'out', 'transfer', 'adjustment']
  for (let i = 0; i < 80; i++) {
    const sku = skus[i % skus.length]
    const loc = locs[i % locs.length]
    await prisma.stockMovement.create({
      data: {
        type: mvTypes[i % mvTypes.length],
        skuMasterId: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.name,
        locationId: loc.id,
        qty: Math.floor(Math.random() * 200) + 10,
        lotNumber: `LOT-${sku.skuCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`,
        lotExpiry: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000),
        referenceType: i % 3 === 0 ? 'purchase_order' : 'order',
        notes: `${mvTypes[i % mvTypes.length]} 처리`,
        createdById: adminUser!.id,
        createdAt: new Date(now.getTime() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000)
      }
    })
  }

  // ── 16. 배송 ─────────────────────────────────────────────
  const shipStatuses = ['preparing', 'shipped', 'in_transit', 'delivered', 'failed']
  const carriers = ['CJ대한통운', '롯데택배', '한진택배', '우체국택배']
  for (let i = 0; i < 150; i++) {
    const customer = customers[i % customers.length]
    const daysAgo = Math.floor(Math.random() * 30)
    const status = shipStatuses[i % shipStatuses.length]
    await prisma.shipment.create({
      data: {
        trackingNo: `${carriers[i % carriers.length].slice(0, 2)}-${String(100000 + i)}`,
        carrier: carriers[i % carriers.length],
        status,
        customerId: customer.id,
        orderId: allOrders[i % allOrders.length]?.id,
        recipientName: customer.name,
        recipientPhone: customer.phone,
        recipientAddress: `서울특별시 강남구 테헤란로 ${100 + i}`,
        weight: Number((Math.random() * 3 + 0.3).toFixed(2)),
        boxCount: Math.floor(Math.random() * 3) + 1,
        shippedAt: status !== 'preparing' ? new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000) : null,
        deliveredAt: status === 'delivered' ? new Date(now.getTime() - (daysAgo - 2) * 24 * 60 * 60 * 1000) : null,
      }
    })
  }

  // ── 17. 반품 ─────────────────────────────────────────────
  const returnStatuses = ['requested', 'received', 'inspected', 'refunded', 'rejected']
  const returnReasons = ['단순변심', '불량/파손', '오배송', '사이즈불만', '기타']
  for (let i = 0; i < 30; i++) {
    const customer = customers[i % customers.length]
    const ret = await prisma.return.create({
      data: {
        returnNo: `RET-2024-${String(i + 1).padStart(4, '0')}`,
        customerId: customer.id,
        orderId: allOrders[i % allOrders.length]?.id,
        reason: returnReasons[i % returnReasons.length],
        status: returnStatuses[i % returnStatuses.length],
        refundAmount: (Math.floor(Math.random() * 5) + 1) * 10000,
        receivedAt: new Date(now.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        createdById: adminUser!.id,
      }
    })
    const sku = skus[i % skus.length]
    await prisma.returnItem.create({
      data: {
        returnId: ret.id,
        skuMasterId: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.name,
        qty: Math.floor(Math.random() * 3) + 1,
        condition: i % 3 === 0 ? '불량' : i % 3 === 1 ? '미개봉' : '개봉',
        lotNumber: `LOT-${sku.skuCode}-202401`,
      }
    })
  }

  // ── 18. 수요 예측 ─────────────────────────────────────────
  const topSkus = skus.slice(0, 8)
  for (const sku of topSkus) {
    for (let m = -3; m <= 5; m++) {
      const fd = new Date(now.getFullYear(), now.getMonth() + m, 1)
      const base = Math.floor(Math.random() * 400) + 100
      const actual = m < 0 ? base + Math.floor(Math.random() * 100) - 50 : null
      await prisma.demandForecast.create({
        data: {
          skuMasterId: sku.id,
          skuCode: sku.skuCode,
          skuName: sku.name,
          forecastDate: fd,
          forecastQty: base,
          actualQty: actual,
          confidence: Number((0.7 + Math.random() * 0.25).toFixed(3)),
          modelVersion: 'v2.1',
          factors: { seasonality: 1.2, trend: 0.05, promotion: m === 1 ? 1.5 : 1.0 }
        }
      })
    }
  }

  // ── 19. VOC 리뷰 ─────────────────────────────────────────
  const sentiments = ['positive', 'neutral', 'negative']
  const reviewContents = [
    '피부에 잘 맞고 촉촉해요. 재구매 의사 있습니다!', '향이 좋고 발림성도 좋아요. 추천합니다.',
    '보통이에요. 가격 대비 평범한 것 같아요.', '생각보다 효과가 없네요. 아쉽습니다.',
    '포장이 불량하게 왔어요. 교환 원합니다.', '피부 트러블이 생겼어요. 반품 원해요.',
    '주문한 것과 다른 제품이 왔어요!', '너무 좋아요. 주변에 다 추천했어요.',
    '피부결이 좋아졌어요. 꾸준히 쓸 예정입니다.', '가격이 좀 비싸긴 하지만 효과는 있어요.',
  ]
  for (let i = 0; i < 60; i++) {
    const sku = skus[i % skus.length]
    const sentiment = i % 5 < 3 ? 'positive' : i % 5 === 3 ? 'neutral' : 'negative'
    await prisma.vocReview.create({
      data: {
        skuMasterId: sku.id,
        channel: channels[i % channels.length],
        channelReviewId: `REV-${Date.now()}-${i}`,
        rating: sentiment === 'positive' ? 5 : sentiment === 'neutral' ? 3 : 1,
        content: reviewContents[i % reviewContents.length],
        sentiment,
        tags: sentiment === 'negative' ? { issues: ['트러블', '포장불량'] } : { keywords: ['보습', '추천'] },
        isAlert: sentiment === 'negative' && i % 10 === 0,
        ingestedAt: new Date(now.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
        analyzedAt: new Date(now.getTime() - Math.floor(Math.random() * 29) * 24 * 60 * 60 * 1000),
      }
    })
  }

  // ── 20. 인플루언서 & 캠페인 ───────────────────────────────
  const influencers = await Promise.all([
    { name: '뷰티블로거 민지', channel: 'instagram', handle: '@minji_beauty', followerCnt: 152000, avgEngagement: 4.8, skinTypeFocus: '건성', categoryFocus: ['스킨케어'] },
    { name: '유튜버 스킨마스터', channel: 'youtube', handle: 'SkinMasterKR', followerCnt: 380000, avgEngagement: 6.2, skinTypeFocus: '복합성', categoryFocus: ['기능성', '스킨케어'] },
    { name: '틱토커 뷰티퀸', channel: 'tiktok', handle: '@beautyqueen_kr', followerCnt: 520000, avgEngagement: 8.1, skinTypeFocus: '지성', categoryFocus: ['색조'] },
    { name: '블로거 천연뷰티', channel: 'naver_blog', handle: 'natural_beauty_kr', followerCnt: 85000, avgEngagement: 3.5, skinTypeFocus: '민감성', categoryFocus: ['마스크팩', '스킨케어'] },
    { name: '인스타 뷰티guru', channel: 'instagram', handle: '@beauty_guru_official', followerCnt: 230000, avgEngagement: 5.3, skinTypeFocus: '정상', categoryFocus: ['색조', '스킨케어'] },
  ].map(inf => prisma.influencer.create({ data: { ...inf, categoryFocus: inf.categoryFocus } })))

  const campaigns = await Promise.all([
    { name: '봄 신제품 론칭 캠페인', type: 'email', status: 'sent' },
    { name: '5월 가정의달 프로모션', type: 'sms', status: 'sent' },
    { name: '여름 선케어 특가전', type: 'email', status: 'active' },
    { name: 'VIP 고객 감사 캠페인', type: 'push', status: 'sent' },
    { name: '신규가입 환영 시리즈', type: 'email', status: 'active' },
  ].map(c => prisma.campaign.create({
    data: {
      ...c,
      sentAt: c.status === 'sent' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : null,
      scheduledAt: c.status === 'active' ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
      createdById: adminUser!.id,
    }
  })))

  // 캠페인 발송 내역
  for (let i = 0; i < 200; i++) {
    const campaign = campaigns[i % campaigns.length]
    const customer = customers[i % customers.length]
    const sentAt = new Date(now.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
    const opened = Math.random() > 0.6
    const clicked = opened && Math.random() > 0.7
    const converted = clicked && Math.random() > 0.8
    await prisma.campaignSend.create({
      data: {
        campaignId: campaign.id,
        customerId: customer.id,
        status: 'sent',
        sentAt,
        openedAt: opened ? new Date(sentAt.getTime() + 3600000) : null,
        clickedAt: clicked ? new Date(sentAt.getTime() + 7200000) : null,
        convertedAt: converted ? new Date(sentAt.getTime() + 86400000) : null,
        revenueAttr: converted ? (Math.floor(Math.random() * 10) + 1) * 10000 : null,
      }
    })
  }

  // 인플루언서 캠페인 연결
  for (let i = 0; i < influencers.length; i++) {
    await prisma.influencerCampaign.create({
      data: {
        influencerId: influencers[i].id,
        campaignId: campaigns[i % campaigns.length].id,
        utmCode: `UTM-INF-${String(i + 1).padStart(3, '0')}`,
        couponCode: `INF${i + 1}SAVE10`,
        fee: (Math.floor(Math.random() * 500) + 100) * 1000,
        revenueAttributed: (Math.floor(Math.random() * 5000) + 500) * 1000,
        roi: Number((Math.random() * 5 + 1).toFixed(2)),
        startedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      }
    })
  }

  // ── 21. 감사 로그 ─────────────────────────────────────────
  const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT']
  const auditResources = ['customer', 'order', 'deal', 'quote', 'inventory', 'campaign']
  for (let i = 0; i < 20; i++) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser!.id,
        action: auditActions[i % auditActions.length],
        resource: auditResources[i % auditResources.length],
        resourceId: `resource-id-${i}`,
        ip: '192.168.1.1',
        createdAt: new Date(now.getTime() - i * 3600000),
      }
    })
  }

  // ── 요약 반환 ─────────────────────────────────────────────
  const counts = await Promise.all([
    prisma.customer.count(),
    prisma.order.count(),
    prisma.deal.count(),
    prisma.skuMaster.count(),
    prisma.shipment.count(),
    prisma.campaign.count(),
  ])

  return NextResponse.json({
    ok: true,
    message: '테스트 데이터 생성 완료',
    summary: {
      customers: counts[0],
      orders: counts[1],
      deals: counts[2],
      skus: counts[3],
      shipments: counts[4],
      campaigns: counts[5],
    }
  })
}, ['super_admin', 'admin'])
