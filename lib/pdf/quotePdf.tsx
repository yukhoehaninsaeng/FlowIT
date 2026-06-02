import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'

export interface QuoteItem {
  name: string
  qty: number
  unitPrice: number
  discount?: number
  total: number
}

export interface QuoteData {
  quoteNo: string
  title: string
  version: number
  status: string
  account?: { name: string } | null
  validUntil?: Date | string | null
  items: QuoteItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  notes?: string | null
  terms?: string | null
  createdAt: Date | string
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 40,
    paddingHorizontal: 48,
    paddingBottom: 40,
    color: '#111',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
    paddingBottom: 16,
  },
  companyName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#2563EB' },
  docTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  quoteNo: { fontSize: 10, color: '#6B7280' },
  metaRow: { flexDirection: 'row', marginBottom: 16, gap: 24 },
  metaBox: { flex: 1 },
  metaLabel: { fontSize: 8, color: '#6B7280', marginBottom: 3, textTransform: 'uppercase' },
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  table: { marginTop: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    color: '#fff',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableRowAlt: { backgroundColor: '#F9FAFB' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'right' },
  colHeader: { color: '#fff', fontSize: 9, fontFamily: 'Helvetica-Bold' },
  totals: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  totalLabel: { fontSize: 10, color: '#6B7280', width: 80, textAlign: 'right' },
  totalValue: { fontSize: 10, width: 100, textAlign: 'right' },
  grandTotalRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#2563EB',
    paddingTop: 8,
  },
  grandLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#2563EB', width: 80, textAlign: 'right' },
  grandValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#2563EB', width: 100, textAlign: 'right' },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 9, color: '#6B7280', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Helvetica-Bold' },
  sectionText: { fontSize: 9, lineHeight: 1.6, color: '#374151' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: '#9CA3AF' },
})

function fmt(n: number): string {
  return `₩${Math.round(n).toLocaleString('ko-KR')}`
}

export function QuotePdfDocument({ q }: { q: QuoteData }) {
  const items = (Array.isArray(q.items) ? q.items : []) as QuoteItem[]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>FlowIT CRM</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.docTitle}>견 적 서</Text>
            <Text style={styles.quoteNo}>{q.quoteNo} (v{q.version})</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>수신처</Text>
            <Text style={styles.metaValue}>{q.account?.name ?? '—'}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>견적명</Text>
            <Text style={styles.metaValue}>{q.title}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>작성일</Text>
            <Text style={styles.metaValue}>
              {new Date(q.createdAt).toLocaleDateString('ko-KR')}
            </Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>유효기간</Text>
            <Text style={styles.metaValue}>
              {q.validUntil ? new Date(q.validUntil).toLocaleDateString('ko-KR') : '협의'}
            </Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.colHeader]}>품목</Text>
            <Text style={[styles.col2, styles.colHeader]}>수량</Text>
            <Text style={[styles.col2, styles.colHeader]}>단가</Text>
            <Text style={[styles.col2, styles.colHeader]}>할인</Text>
            <Text style={[styles.col2, styles.colHeader]}>금액</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={styles.col1}>{item.name}</Text>
              <Text style={styles.col2}>{item.qty}</Text>
              <Text style={styles.col2}>{fmt(item.unitPrice)}</Text>
              <Text style={styles.col2}>{item.discount ? `${item.discount}%` : '—'}</Text>
              <Text style={styles.col2}>{fmt(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>소계</Text>
            <Text style={styles.totalValue}>{fmt(Number(q.subtotal))}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>부가세 ({q.taxRate}%)</Text>
            <Text style={styles.totalValue}>{fmt(Number(q.taxAmount))}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandLabel}>합계</Text>
            <Text style={styles.grandValue}>{fmt(Number(q.totalAmount))}</Text>
          </View>
        </View>

        {/* Notes / Terms */}
        {q.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>비고</Text>
            <Text style={styles.sectionText}>{q.notes}</Text>
          </View>
        )}
        {q.terms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>계약 조건</Text>
            <Text style={styles.sectionText}>{q.terms}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>FlowIT CRM</Text>
          <Text style={styles.footerText}>{q.quoteNo}</Text>
        </View>
      </Page>
    </Document>
  )
}
