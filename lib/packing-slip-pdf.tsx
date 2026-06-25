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
	Font,
} from '@react-pdf/renderer';

// ─── Fonts ────────────────────────────────────────────────────────────────────

Font.register({
	family: 'Inter',
	fonts: [
		{
			src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff',
			fontWeight: 400,
		},
		{
			src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff',
			fontWeight: 600,
		},
		{
			src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff',
			fontWeight: 700,
		},
	],
});

// ─── Colour palette ───────────────────────────────────────────────────────────

const C = {
	black: '#0f172a',
	brand: '#1e293b',
	accent: '#6d28d9', // violet — Beauty Logix brand colour
	accentLight: '#ede9fe',
	red: '#dc2626',
	amber: '#d97706',
	muted: '#64748b',
	mutedLight: '#f8fafc',
	border: '#e2e8f0',
	white: '#ffffff',
	rowAlt: '#f8fafc',
	green: '#15803d',
	greenLight: '#dcfce7',
	walkIn: '#7c3aed',
	walkInLight: '#f5f3ff',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
	page: {
		fontFamily: 'Inter',
		fontSize: 9,
		color: C.black,
		paddingTop: 36,
		paddingBottom: 48,
		paddingHorizontal: 36,
		backgroundColor: C.white,
	},

	// Header
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
		fontSize: 18,
		fontWeight: 700,
		color: C.accent,
		letterSpacing: 1.5,
	},
	docSubtitle: { fontSize: 9, color: C.muted, marginTop: 2 },

	// Meta grid
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
		fontSize: 7,
		color: C.muted,
		fontWeight: 600,
		marginBottom: 3,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
	},
	metaValue: { fontSize: 10, fontWeight: 700, color: C.black },
	metaValueSmall: { fontSize: 9, fontWeight: 600, color: C.black },

	// Status bar
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
	statusPillText: { fontSize: 8, fontWeight: 600, color: C.accent },

	// Table
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
	tableRowWalkIn: { backgroundColor: C.walkInLight },
	tableRowShortfall: { backgroundColor: '#fff7ed' },
	tableRowPacked: { backgroundColor: C.greenLight },

	thText: {
		fontSize: 8,
		fontWeight: 700,
		color: C.white,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	tdText: { fontSize: 9, color: C.black },
	tdMuted: { fontSize: 8, color: C.muted },
	tdRed: { fontSize: 9, color: C.red, fontWeight: 700 },
	tdAmber: { fontSize: 9, color: C.amber, fontWeight: 600 },
	tdGreen: { fontSize: 9, color: C.green, fontWeight: 600 },
	tdViolet: { fontSize: 9, color: C.walkIn, fontWeight: 600 },

	// Column widths
	colNum: { width: 22 },
	colCode: { width: 76 },
	colName: { flex: 1 },
	colReq: { width: 38, alignItems: 'flex-end' },
	colFil: { width: 38, alignItems: 'flex-end' },
	colNote: { width: 90 },

	// Totals row
	totalsRow: {
		flexDirection: 'row',
		paddingVertical: 8,
		paddingHorizontal: 8,
		backgroundColor: C.brand,
	},
	totalsLabel: { flex: 1, fontSize: 9, fontWeight: 700, color: C.white },
	totalsVal: {
		width: 38,
		alignItems: 'flex-end',
		fontSize: 9,
		fontWeight: 700,
		color: C.white,
	},

	// Legend
	legend: {
		flexDirection: 'row',
		gap: 14,
		marginBottom: 20,
		flexWrap: 'wrap',
	},
	legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
	legendDot: { width: 8, height: 8, borderRadius: 4 },
	legendText: { fontSize: 7.5, color: C.muted },

	// Sign-off section
	signoffSection: {
		flexDirection: 'row',
		gap: 16,
		marginTop: 8,
	},
	signoffBox: {
		flex: 1,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 6,
		padding: 10,
	},
	signoffTitle: {
		fontSize: 8,
		fontWeight: 700,
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

	// Footer
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

export interface PackingSlipItem {
	productCode: string | null;
	productName: string;
	requestedRetailQty: number;
	requestedConsumableQty: number;
	fulfilledRetailQty: number;
	fulfilledConsumableQty: number;
	isPacked: boolean;
	isWalkIn: boolean;
	notes: string | null;
}

export interface PackingSlipData {
	orderNumber: string;
	centerName: string;
	org: string;
	supplier: string | null;
	raisedAt: Date | null;
	deliverBy: Date | null;
	packedAt: Date;
	packedBy: string;
	items: PackingSlipItem[];
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

function PackingSlipDocument({ data }: { data: PackingSlipData }) {
	const logo = getLogoBase64();
	const orgLabel = data.org === 'bfs' ? 'Beauty First Spa' : 'Beauty Logix';

	const totalReqRetail = data.items.reduce(
		(s, i) => s + i.requestedRetailQty,
		0
	);
	const totalReqCons = data.items.reduce(
		(s, i) => s + i.requestedConsumableQty,
		0
	);
	const totalFilRetail = data.items.reduce(
		(s, i) => s + i.fulfilledRetailQty,
		0
	);
	const totalFilCons = data.items.reduce(
		(s, i) => s + i.fulfilledConsumableQty,
		0
	);

	const packedCount = data.items.filter((i) => i.isPacked).length;
	const shortfallItems = data.items.filter(
		(i) =>
			i.fulfilledRetailQty < i.requestedRetailQty ||
			i.fulfilledConsumableQty < i.requestedConsumableQty
	);
	const walkInItems = data.items.filter((i) => i.isWalkIn);

	return (
		<Document
			title={`Packing Slip — ${data.centerName} — Order #${data.orderNumber}`}
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
									fontSize: 14,
									fontWeight: 700,
									color: C.accent,
								}}
							>
								BEAUTY LOGIX
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
						<Text style={s.metaValue}>#{data.orderNumber}</Text>
					</View>
					<View style={s.metaCard}>
						<Text style={s.metaLabel}>Store</Text>
						<Text style={s.metaValueSmall}>{data.centerName}</Text>
						<Text style={[s.metaLabel, { marginTop: 3 }]}>
							{orgLabel}
						</Text>
					</View>
					<View style={s.metaCard}>
						<Text style={s.metaLabel}>Supplier</Text>
						<Text style={s.metaValueSmall}>
							{data.supplier || '—'}
						</Text>
					</View>
					<View style={s.metaCard}>
						<Text style={s.metaLabel}>Raised</Text>
						<Text style={s.metaValueSmall}>
							{fmt(data.raisedAt)}
						</Text>
						<Text style={[s.metaLabel, { marginTop: 4 }]}>
							Deliver by
						</Text>
						<Text
							style={[
								s.metaValueSmall,
								data.deliverBy &&
								new Date(data.deliverBy) < new Date()
									? { color: C.red }
									: {},
							]}
						>
							{fmt(data.deliverBy)}
						</Text>
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
					{walkInItems.length > 0 && (
						<View
							style={[
								s.statusPill,
								{ backgroundColor: C.walkInLight },
							]}
						>
							<Text
								style={[s.statusPillText, { color: C.walkIn }]}
							>
								{walkInItems.length} walk-in addition
								{walkInItems.length !== 1 ? 's' : ''}
							</Text>
						</View>
					)}
				</View>

				{/* ── Items table ── */}
				<View style={s.tableWrapper}>
					{/* Table header */}
					<View style={s.tableHead}>
						<View style={s.colNum}>
							<Text style={s.thText}>#</Text>
						</View>
						<View style={s.colCode}>
							<Text style={s.thText}>Code</Text>
						</View>
						<View style={s.colName}>
							<Text style={s.thText}>Product</Text>
						</View>
						<View style={s.colReq}>
							<Text style={s.thText}>Req R</Text>
						</View>
						<View style={s.colFil}>
							<Text style={s.thText}>Fil R</Text>
						</View>
						<View style={s.colReq}>
							<Text style={s.thText}>Req C</Text>
						</View>
						<View style={s.colFil}>
							<Text style={s.thText}>Fil C</Text>
						</View>
						<View style={s.colNote}>
							<Text style={s.thText}>Note</Text>
						</View>
					</View>

					{/* Rows */}
					{data.items.map((item, i) => {
						const retailShort =
							item.fulfilledRetailQty < item.requestedRetailQty &&
							item.requestedRetailQty > 0;
						const consShort =
							item.fulfilledConsumableQty <
								item.requestedConsumableQty &&
							item.requestedConsumableQty > 0;
						const hasShortfall = retailShort || consShort;

						const rowStyle = item.isWalkIn
							? s.tableRowWalkIn
							: hasShortfall
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
								<View style={s.colCode}>
									<Text
										style={[
											s.tdText,
											{ fontFamily: 'Courier' },
										]}
									>
										{item.productCode ?? ''}
									</Text>
									{item.isWalkIn && (
										<Text
											style={[
												s.tdViolet,
												{ fontSize: 7 },
											]}
										>
											Walk-in
										</Text>
									)}
								</View>
								<View style={s.colName}>
									<Text
										style={[
											s.tdText,
											{
												fontWeight: item.isPacked
													? 400
													: 600,
											},
										]}
									>
										{item.productName}
									</Text>
								</View>
								{/* Retail */}
								<View style={s.colReq}>
									<Text style={s.tdMuted}>
										{item.requestedRetailQty || '—'}
									</Text>
								</View>
								<View style={s.colFil}>
									<Text
										style={
											retailShort
												? item.fulfilledRetailQty === 0
													? s.tdRed
													: s.tdAmber
												: s.tdGreen
										}
									>
										{item.fulfilledRetailQty || '0'}
									</Text>
								</View>
								{/* Consumable */}
								<View style={s.colReq}>
									<Text style={s.tdMuted}>
										{item.requestedConsumableQty || '—'}
									</Text>
								</View>
								<View style={s.colFil}>
									<Text
										style={
											consShort
												? item.fulfilledConsumableQty ===
													0
													? s.tdRed
													: s.tdAmber
												: s.tdGreen
										}
									>
										{item.fulfilledConsumableQty || '0'}
									</Text>
								</View>
								<View style={s.colNote}>
									<Text style={s.tdMuted}>
										{item.notes ?? ''}
									</Text>
								</View>
							</View>
						);
					})}

					{/* Totals */}
					<View style={s.totalsRow}>
						<View style={s.colNum}>
							<Text style={s.thText}> </Text>
						</View>
						<View style={s.colCode}>
							<Text style={s.thText}> </Text>
						</View>
						<View style={s.colName}>
							<Text style={s.totalsLabel}>TOTAL</Text>
						</View>
						<View style={s.colReq}>
							<Text style={s.totalsVal}>{totalReqRetail}</Text>
						</View>
						<View style={s.colFil}>
							<Text
								style={[
									s.totalsVal,
									totalFilRetail < totalReqRetail
										? { color: '#fca5a5' }
										: {},
								]}
							>
								{totalFilRetail}
							</Text>
						</View>
						<View style={s.colReq}>
							<Text style={s.totalsVal}>{totalReqCons}</Text>
						</View>
						<View style={s.colFil}>
							<Text
								style={[
									s.totalsVal,
									totalFilCons < totalReqCons
										? { color: '#fca5a5' }
										: {},
								]}
							>
								{totalFilCons}
							</Text>
						</View>
						<View style={s.colNote}>
							<Text style={s.thText}> </Text>
						</View>
					</View>
				</View>

				{/* ── Column key ── */}
				<View style={s.legend}>
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
								{ backgroundColor: C.walkInLight },
							]}
						/>
						<Text style={s.legendText}>Walk-in addition</Text>
					</View>
					<Text style={[s.legendText, { marginLeft: 6 }]}>
						Req R = Requested retail · Fil R = Filled retail · Req C
						/ Fil C = Consumable
					</Text>
				</View>

				{/* ── Sign-off blocks ── */}
				<View style={s.signoffSection}>
					<View style={s.signoffBox}>
						<Text style={s.signoffTitle}>
							Packed by (Warehouse)
						</Text>
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
					<View style={s.signoffBox}>
						<Text style={s.signoffTitle}>Received by (Store)</Text>
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

export async function generatePackingSlipPdf(
	data: PackingSlipData
): Promise<Buffer> {
	const buf = await renderToBuffer(<PackingSlipDocument data={data} />);
	return Buffer.from(buf);
}
