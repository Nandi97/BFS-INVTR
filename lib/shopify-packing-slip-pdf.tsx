import path from 'path';
import fs from 'fs';
import {
	Document,
	Page,
	Text,
	View,
	Image,
	StyleSheet,
	renderToBuffer,
} from '@react-pdf/renderer';

// react-pdf built-in fonts — no network fetch, no 404 risk.
// Bold is achieved via fontFamily: 'Helvetica-Bold' rather than fontWeight.

// ─── Colour palette (matches lib/packing-slip-pdf.tsx) ────────────────────────

const C = {
	black: '#0f172a',
	brand: '#1e293b',
	accent: '#d4006e', // deep hot pink — Beauty First brand colour
	accentLight: '#fce4ec',
	red: '#dc2626',
	amber: '#d97706',
	muted: '#64748b',
	mutedLight: '#fdf2f8',
	border: '#e2e8f0',
	white: '#ffffff',
	rowAlt: '#fdf2f8',
	green: '#15803d',
	greenLight: '#dcfce7',
	nonWarehoused: '#7c3aed',
	nonWarehousedLight: '#f5f3ff',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
	page: {
		fontFamily: 'Helvetica',
		fontSize: 9,
		color: C.black,
		paddingTop: 36,
		paddingBottom: 48,
		paddingHorizontal: 36,
		backgroundColor: C.white,
	},

	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 20,
		paddingBottom: 16,
		borderBottomWidth: 2,
		borderBottomColor: C.accent,
	},
	logo: { width: 110, height: 40, objectFit: 'contain' },
	headerRight: { alignItems: 'flex-end' },
	docTitle: {
		fontFamily: 'Helvetica-Bold',
		fontSize: 18,
		color: C.accent,
		letterSpacing: 1.5,
	},
	docSubtitle: { fontSize: 9, color: C.muted, marginTop: 2 },

	metaGrid: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 18,
	},
	metaCard: {
		flex: 1,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 6,
		padding: 10,
		backgroundColor: C.mutedLight,
	},
	metaLabel: {
		fontFamily: 'Helvetica-Bold',
		fontSize: 7,
		color: C.muted,
		marginBottom: 3,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
	},
	metaValue: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.black },
	metaValueSmall: {
		fontFamily: 'Helvetica-Bold',
		fontSize: 9,
		color: C.black,
	},

	statusBar: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 16,
	},
	statusPill: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 20,
		backgroundColor: C.accentLight,
	},
	statusPillText: {
		fontFamily: 'Helvetica-Bold',
		fontSize: 8,
		color: C.accent,
	},

	tableWrapper: {
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 6,
		overflow: 'hidden',
		marginBottom: 16,
	},
	tableHead: {
		flexDirection: 'row',
		backgroundColor: C.brand,
		paddingVertical: 8,
		paddingHorizontal: 8,
	},
	tableRow: {
		flexDirection: 'row',
		paddingVertical: 7,
		paddingHorizontal: 8,
		borderTopWidth: 1,
		borderTopColor: C.border,
		minHeight: 28,
	},
	tableRowAlt: { backgroundColor: C.rowAlt },
	tableRowNonWarehoused: { backgroundColor: C.nonWarehousedLight },
	tableRowShortfall: { backgroundColor: '#fff7ed' },
	tableRowPacked: { backgroundColor: C.greenLight },

	thText: {
		fontFamily: 'Helvetica-Bold',
		fontSize: 8,
		color: C.white,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	tdText: { fontSize: 9, color: C.black },
	tdMuted: { fontSize: 8, color: C.muted },
	tdRed: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.red },
	tdAmber: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.amber },
	tdGreen: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.green },
	tdViolet: {
		fontFamily: 'Helvetica-Bold',
		fontSize: 9,
		color: C.nonWarehoused,
	},

	colNum: { width: 18 },
	colSku: { width: 68 },
	colName: { flex: 1 },
	colQty: { width: 34, alignItems: 'flex-end' },
	colPrice: { width: 50, alignItems: 'flex-end' },
	colDiscount: { width: 50, alignItems: 'flex-end' },
	colTotal: { width: 56, alignItems: 'flex-end' },

	totalsRow: {
		flexDirection: 'row',
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	totalsLabel: { fontSize: 9, color: C.muted },
	totalsVal: {
		fontFamily: 'Helvetica-Bold',
		fontSize: 9,
		color: C.black,
	},
	grandTotalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
		paddingHorizontal: 12,
		backgroundColor: C.brand,
		borderRadius: 6,
		marginTop: 2,
	},
	grandTotalLabel: {
		fontFamily: 'Helvetica-Bold',
		fontSize: 10,
		color: C.white,
	},
	grandTotalVal: {
		fontFamily: 'Helvetica-Bold',
		fontSize: 10,
		color: C.white,
	},

	legend: {
		flexDirection: 'row',
		gap: 14,
		marginBottom: 20,
		flexWrap: 'wrap',
	},
	legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	legendDot: { width: 8, height: 8, borderRadius: 4 },
	legendText: { fontSize: 7.5, color: C.muted },

	signoffBox: {
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 6,
		padding: 10,
		width: 260,
	},
	signoffTitle: {
		fontFamily: 'Helvetica-Bold',
		fontSize: 8,
		color: C.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: 10,
	},
	signoffLine: {
		borderBottomWidth: 1,
		borderBottomColor: C.border,
		marginBottom: 10,
		paddingBottom: 10,
	},
	signoffLineLabel: { fontSize: 7.5, color: C.muted },

	pageFooter: {
		position: 'absolute',
		bottom: 20,
		left: 36,
		right: 36,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	footerText: { fontSize: 7.5, color: C.muted },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShopifyPackingSlipItem {
	sku: string | null;
	title: string;
	variantTitle: string | null;
	requestedQty: number;
	fulfilledQty: number;
	unitPrice: number | null;
	totalDiscount: number;
	isPacked: boolean;
	isNonWarehoused: boolean;
	notes: string | null;
}

export interface ShopifyPackingSlipData {
	orderNumber: string;
	storeDomain: string;
	customerName: string | null;
	shippingLines: string[];
	currency: string;
	subtotal: number;
	totalDiscounts: number;
	discountCodes: string | null;
	total: number;
	packedAt: Date;
	packedBy: string;
	items: ShopifyPackingSlipItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d: Date | null) {
	if (!d) return '—';
	return new Date(d).toLocaleDateString('en-CA', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function money(currency: string, amount: number) {
	return `${currency} $${amount.toFixed(2)}`;
}

function getLogoBase64(): string | null {
	try {
		const p = path.join(
			process.cwd(),
			'public',
			'assets',
			'images',
			'Beauty_Logix_Logo.png'
		);
		const buf = fs.readFileSync(p);
		return `data:image/png;base64,${buf.toString('base64')}`;
	} catch {
		return null;
	}
}

// ─── Document ────────────────────────────────────────────────────────────────

function ShopifyPackingSlipDocument({
	data,
}: {
	data: ShopifyPackingSlipData;
}) {
	const logo = getLogoBase64();
	const storeName = data.storeDomain.replace('.myshopify.com', '');

	const packedCount = data.items.filter((i) => i.isPacked).length;
	const shortfallItems = data.items.filter(
		(i) => i.fulfilledQty < i.requestedQty
	);
	const nonWarehousedItems = data.items.filter((i) => i.isNonWarehoused);

	return (
		<Document
			title={`Packing Slip — Order ${data.orderNumber}`}
			author="BFS Inventory"
		>
			<Page size="A4" style={s.page}>
				{/* ── Header ── */}
				<View style={s.header}>
					<View>
						{logo ? (
							<Image src={logo} style={s.logo} />
						) : (
							<Text
								style={{
									fontFamily: 'Helvetica-Bold',
									fontSize: 14,
									color: C.accent,
								}}
							>
								BEAUTY FIRST
							</Text>
						)}
					</View>
					<View style={s.headerRight}>
						<Text style={s.docTitle}>PACKING SLIP</Text>
						<Text style={s.docSubtitle}>
							Generated {fmt(data.packedAt)} · BFS Inventory
						</Text>
					</View>
				</View>

				{/* ── Meta cards ── */}
				<View style={s.metaGrid}>
					<View style={s.metaCard}>
						<Text style={s.metaLabel}>Order</Text>
						<Text style={s.metaValue}>{data.orderNumber}</Text>
						<Text style={[s.metaLabel, { marginTop: 3 }]}>
							{storeName}
						</Text>
					</View>
					<View style={s.metaCard}>
						<Text style={s.metaLabel}>Customer</Text>
						<Text style={s.metaValueSmall}>
							{data.customerName || '—'}
						</Text>
					</View>
					<View style={s.metaCard}>
						<Text style={s.metaLabel}>Ship To</Text>
						{data.shippingLines.length > 0 ? (
							data.shippingLines.slice(0, 3).map((line, i) => (
								<Text key={i} style={s.metaValueSmall}>
									{line}
								</Text>
							))
						) : (
							<Text style={s.metaValueSmall}>—</Text>
						)}
					</View>
					<View style={s.metaCard}>
						<Text style={s.metaLabel}>Packed by</Text>
						<Text style={s.metaValueSmall}>{data.packedBy}</Text>
						<Text style={[s.metaLabel, { marginTop: 4 }]}>
							Packed on
						</Text>
						<Text style={s.metaValueSmall}>
							{fmt(data.packedAt)}
						</Text>
					</View>
				</View>

				{/* ── Status pills ── */}
				<View style={s.statusBar}>
					<View style={s.statusPill}>
						<Text style={s.statusPillText}>
							{packedCount}/{data.items.length} items packed
						</Text>
					</View>
					{shortfallItems.length > 0 && (
						<View
							style={[
								s.statusPill,
								{ backgroundColor: '#fef3c7' },
							]}
						>
							<Text
								style={[s.statusPillText, { color: C.amber }]}
							>
								{shortfallItems.length} shortfall
								{shortfallItems.length !== 1 ? 's' : ''}
							</Text>
						</View>
					)}
					{nonWarehousedItems.length > 0 && (
						<View
							style={[
								s.statusPill,
								{ backgroundColor: C.nonWarehousedLight },
							]}
						>
							<Text
								style={[
									s.statusPillText,
									{ color: C.nonWarehoused },
								]}
							>
								{nonWarehousedItems.length} not stocked in-house
							</Text>
						</View>
					)}
					{data.discountCodes && (
						<View
							style={[
								s.statusPill,
								{ backgroundColor: '#dbeafe' },
							]}
						>
							<Text
								style={[s.statusPillText, { color: '#1d4ed8' }]}
							>
								Discount: {data.discountCodes}
							</Text>
						</View>
					)}
				</View>

				{/* ── Items table ── */}
				<View style={s.tableWrapper}>
					<View style={s.tableHead}>
						<View style={s.colNum}>
							<Text style={s.thText}>#</Text>
						</View>
						<View style={s.colSku}>
							<Text style={s.thText}>SKU</Text>
						</View>
						<View style={s.colName}>
							<Text style={s.thText}>Product</Text>
						</View>
						<View style={s.colQty}>
							<Text style={s.thText}>Req</Text>
						</View>
						<View style={s.colQty}>
							<Text style={s.thText}>Fil</Text>
						</View>
						<View style={s.colPrice}>
							<Text style={s.thText}>Unit</Text>
						</View>
						<View style={s.colDiscount}>
							<Text style={s.thText}>Disc.</Text>
						</View>
						<View style={s.colTotal}>
							<Text style={s.thText}>Net</Text>
						</View>
					</View>

					{data.items.map((item, i) => {
						const short =
							item.fulfilledQty < item.requestedQty &&
							item.requestedQty > 0;
						const lineGross =
							(item.unitPrice ?? 0) * item.fulfilledQty;
						const lineNet = lineGross - item.totalDiscount;

						const rowStyle = item.isNonWarehoused
							? s.tableRowNonWarehoused
							: short
								? s.tableRowShortfall
								: item.isPacked
									? s.tableRowPacked
									: i % 2 === 1
										? s.tableRowAlt
										: undefined;

						return (
							<View
								key={i}
								style={[s.tableRow, rowStyle ?? {}]}
								wrap={false}
							>
								<View style={s.colNum}>
									<Text style={s.tdMuted}>{i + 1}</Text>
								</View>
								<View style={s.colSku}>
									<Text
										style={[
											s.tdText,
											{ fontFamily: 'Courier' },
										]}
									>
										{item.sku ?? ''}
									</Text>
									{item.isNonWarehoused && (
										<Text
											style={[
												s.tdViolet,
												{ fontSize: 7 },
											]}
										>
											Not in-house
										</Text>
									)}
								</View>
								<View style={s.colName}>
									<Text style={s.tdText}>{item.title}</Text>
									{item.variantTitle && (
										<Text style={s.tdMuted}>
											{item.variantTitle}
										</Text>
									)}
									{item.notes && (
										<Text
											style={[s.tdMuted, { fontSize: 7 }]}
										>
											{item.notes}
										</Text>
									)}
								</View>
								<View style={s.colQty}>
									<Text style={s.tdMuted}>
										{item.requestedQty}
									</Text>
								</View>
								<View style={s.colQty}>
									<Text
										style={
											short
												? item.fulfilledQty === 0
													? s.tdRed
													: s.tdAmber
												: s.tdGreen
										}
									>
										{item.fulfilledQty}
									</Text>
								</View>
								<View style={s.colPrice}>
									<Text style={s.tdText}>
										${(item.unitPrice ?? 0).toFixed(2)}
									</Text>
								</View>
								<View style={s.colDiscount}>
									<Text style={s.tdMuted}>
										{item.totalDiscount > 0
											? `-$${item.totalDiscount.toFixed(2)}`
											: '—'}
									</Text>
								</View>
								<View style={s.colTotal}>
									<Text
										style={[
											s.tdText,
											{ fontFamily: 'Helvetica-Bold' },
										]}
									>
										${lineNet.toFixed(2)}
									</Text>
								</View>
							</View>
						);
					})}
				</View>

				{/* ── Order totals ── */}
				<View style={{ marginBottom: 16 }}>
					<View style={s.totalsRow}>
						<View style={{ flex: 1 }} />
						<Text style={s.totalsLabel}>Subtotal</Text>
						<Text
							style={[
								s.totalsVal,
								{ width: 70, textAlign: 'right' },
							]}
						>
							{money(data.currency, data.subtotal)}
						</Text>
					</View>
					{data.totalDiscounts > 0 && (
						<View style={s.totalsRow}>
							<View style={{ flex: 1 }} />
							<Text style={s.totalsLabel}>
								Discount
								{data.discountCodes
									? ` (${data.discountCodes})`
									: ''}
							</Text>
							<Text
								style={[
									s.totalsVal,
									{
										width: 70,
										textAlign: 'right',
										color: C.red,
									},
								]}
							>
								-{money(data.currency, data.totalDiscounts)}
							</Text>
						</View>
					)}
					<View style={s.grandTotalRow}>
						<Text style={s.grandTotalLabel}>TOTAL</Text>
						<Text style={s.grandTotalVal}>
							{money(data.currency, data.total)}
						</Text>
					</View>
				</View>

				{/* ── Column key ── */}
				<View style={s.legend} wrap={false}>
					<View style={s.legendItem}>
						<View
							style={[
								s.legendDot,
								{ backgroundColor: C.greenLight },
							]}
						/>
						<Text style={s.legendText}>Packed — full qty</Text>
					</View>
					<View style={s.legendItem}>
						<View
							style={[
								s.legendDot,
								{ backgroundColor: '#fef3c7' },
							]}
						/>
						<Text style={s.legendText}>Partial shortfall</Text>
					</View>
					<View style={s.legendItem}>
						<View
							style={[
								s.legendDot,
								{ backgroundColor: '#fee2e2' },
							]}
						/>
						<Text style={s.legendText}>
							Zero filled (out of stock)
						</Text>
					</View>
					<View style={s.legendItem}>
						<View
							style={[
								s.legendDot,
								{ backgroundColor: C.nonWarehousedLight },
							]}
						/>
						<Text style={s.legendText}>Not stocked in-house</Text>
					</View>
				</View>

				{/* ── Sign-off ── */}
				<View style={s.signoffBox} wrap={false}>
					<Text style={s.signoffTitle}>Packed by (Warehouse)</Text>
					<View style={s.signoffLine}>
						<Text style={s.signoffLineLabel}>
							Name: ___________________________
						</Text>
					</View>
					<View style={s.signoffLine}>
						<Text style={s.signoffLineLabel}>
							Signature: ______________________
						</Text>
					</View>
					<Text style={s.signoffLineLabel}>
						Date: ___________________________
					</Text>
				</View>

				{/* ── Page footer ── */}
				<View style={s.pageFooter} fixed>
					<Text style={s.footerText}>
						BFS Inventory · bfs.kigtech.digital
					</Text>
					<Text
						style={s.footerText}
						render={({ pageNumber, totalPages }) =>
							`Page ${pageNumber} of ${totalPages}`
						}
					/>
				</View>
			</Page>
		</Document>
	);
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function generateShopifyPackingSlipPdf(
	data: ShopifyPackingSlipData
): Promise<Buffer> {
	const buf = await renderToBuffer(
		<ShopifyPackingSlipDocument data={data} />
	);
	return Buffer.from(buf);
}
