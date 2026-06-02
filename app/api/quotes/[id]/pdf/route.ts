import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { QuotePdfDocument } from '@/lib/pdf/quotePdf'
import type { QuoteData } from '@/lib/pdf/quotePdf'

export const GET = withAuth(async (_req, { params }) => {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { account: { select: { id: true, name: true } } },
  })
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const q: QuoteData = {
    quoteNo: quote.quoteNo,
    title: quote.title,
    version: quote.version,
    status: quote.status,
    account: quote.account,
    validUntil: quote.validUntil,
    items: (quote.items as unknown as QuoteData['items']),
    subtotal: Number(quote.subtotal),
    taxRate: Number(quote.taxRate),
    taxAmount: Number(quote.taxAmount),
    totalAmount: Number(quote.totalAmount),
    notes: quote.notes,
    terms: quote.terms,
    createdAt: quote.createdAt,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(QuotePdfDocument, { q }) as any)
  const uint8 = new Uint8Array(buffer)

  return new NextResponse(uint8, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${quote.quoteNo}.pdf"`,
    },
  })
})
