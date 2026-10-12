import type { jsPDF } from 'jspdf'
import { spreadOverlappingPins } from '@/components/mapUtils'
import { DISTRICT_COLORS } from '@/lib/districtColors'
import type { DistrictDto, MemberDto } from '@/type'

// A district and the people in it, ready to print. `members` is in the order
// they are numbered in the roster and on the map.
export type DistrictReport = {
  district: DistrictDto
  leader?: MemberDto
  assistant?: MemberDto
  members: MemberDto[]
}

const displayName = (member: MemberDto) =>
  [member.familyName, member.name].filter(Boolean).join(', ')

/** Groups a ward's members into one printable report per district. */
export const buildDistrictReports = (
  districts: DistrictDto[],
  members: MemberDto[],
): DistrictReport[] =>
  districts.map((district) => ({
    district,
    leader: members.find((m) => m.id === district.leaderId),
    assistant: members.find((m) => m.id === district.assistantId),
    members: members
      .filter((m) => m.district?.id === district.id)
      .sort((a, b) => displayName(a).localeCompare(displayName(b))),
  }))

// --- Page geometry (US Letter, points) -------------------------------------

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 40
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

// --- Map rendering -----------------------------------------------------------
//
// The map page is drawn onto a canvas from OpenStreetMap's standard tiles and
// placed in the PDF as an image. Each district needs roughly 30 tiles; they
// are fetched a few at a time, the same way a map on screen loads them, and
// the "© OpenStreetMap contributors" credit is drawn onto the map itself.

const TILE_SIZE = 256
const TILE_URL = (z: number, x: number, y: number) =>
  `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
const MAX_ZOOM = 18
// With one located member (or several at one spot) there is no area to fit,
// so use a street-level zoom.
const SINGLE_POINT_ZOOM = 16
// Canvas pixels per PDF point: enough detail to read street names in print
// without multiplying the number of tiles.
const MAP_SCALE = 1.6
const MAP_PADDING_PX = 60
const TILE_CONCURRENCY = 4
const PIN_RADIUS = 11

type Pixel = { x: number; y: number }
type LatLng = { lat: number; lng: number }

// Web Mercator, in pixels of the whole world at zoom `z`.
const project = ({ lat, lng }: LatLng, z: number): Pixel => {
  const size = TILE_SIZE * 2 ** z
  const sin = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  }
}

const unproject = ({ x, y }: Pixel, z: number): LatLng => {
  const size = TILE_SIZE * 2 ** z
  const n = Math.PI - (2 * Math.PI * y) / size
  return {
    lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng: (x / size) * 360 - 180,
  }
}

const loadTile = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image()
    // Needed to read the canvas back out; the tile server allows it.
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    // A missing tile leaves a blank square rather than failing the report.
    image.onerror = () => resolve(null)
    image.src = url
  })

const colorHex = (name?: string | null) =>
  DISTRICT_COLORS.find((color) => color.name === name)?.value ?? '#3357FF'

// Black or white, whichever reads better on the given fill.
const textColorOn = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) =>
    Number.parseInt(hex.slice(i, i + 2), 16),
  )
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? '#000000' : '#ffffff'
}

/**
 * Draws a map of the report's members (numbered to match the roster) and
 * returns it as a JPEG data URL, or null when no member has coordinates.
 */
const renderMap = async (
  report: DistrictReport,
  width: number,
  height: number,
): Promise<string | null> => {
  const located = report.members
    .map((member, index) => ({ member, number: index + 1 }))
    .filter(({ member }) => member.lat != null && member.lng != null)
  if (located.length === 0) return null

  const points = located.map(({ member }) => ({
    lat: member.lat as number,
    lng: member.lng as number,
  }))
  const bounds = {
    north: Math.max(...points.map((p) => p.lat)),
    south: Math.min(...points.map((p) => p.lat)),
    east: Math.max(...points.map((p) => p.lng)),
    west: Math.min(...points.map((p) => p.lng)),
  }

  // The closest zoom at which everyone fits inside the padded canvas.
  let zoom = MAX_ZOOM
  for (; zoom > 1; zoom--) {
    const topLeft = project({ lat: bounds.north, lng: bounds.west }, zoom)
    const bottomRight = project({ lat: bounds.south, lng: bounds.east }, zoom)
    if (
      bottomRight.x - topLeft.x <= width - 2 * MAP_PADDING_PX &&
      bottomRight.y - topLeft.y <= height - 2 * MAP_PADDING_PX
    ) {
      break
    }
  }
  const singlePoint =
    bounds.north - bounds.south < 1e-6 && bounds.east - bounds.west < 1e-6
  if (singlePoint) zoom = SINGLE_POINT_ZOOM

  const center = project(
    {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2,
    },
    zoom,
  )
  // World pixel at the canvas's top-left corner.
  const origin = {
    x: Math.round(center.x - width / 2),
    y: Math.round(center.y - height / 2),
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#e5e7eb'
  ctx.fillRect(0, 0, width, height)

  const tiles: { x: number; y: number }[] = []
  const lastTile = 2 ** zoom - 1
  for (
    let x = Math.floor(origin.x / TILE_SIZE);
    x <= Math.floor((origin.x + width) / TILE_SIZE);
    x++
  ) {
    for (
      let y = Math.floor(origin.y / TILE_SIZE);
      y <= Math.floor((origin.y + height) / TILE_SIZE);
      y++
    ) {
      if (x >= 0 && y >= 0 && x <= lastTile && y <= lastTile)
        tiles.push({ x, y })
    }
  }
  // A few at a time, like a map on screen, rather than all at once.
  for (let i = 0; i < tiles.length; i += TILE_CONCURRENCY) {
    await Promise.all(
      tiles.slice(i, i + TILE_CONCURRENCY).map(async (tile) => {
        const image = await loadTile(TILE_URL(zoom, tile.x, tile.y))
        if (image) {
          ctx.drawImage(
            image,
            tile.x * TILE_SIZE - origin.x,
            tile.y * TILE_SIZE - origin.y,
          )
        }
      }),
    )
  }

  // Pins that would cover each other are nudged apart, with a line back to
  // the real spot - the same treatment as the on-screen map.
  const toCanvas = (point: LatLng): Pixel => {
    const world = project(point, zoom)
    return { x: world.x - origin.x, y: world.y - origin.y }
  }
  const numbers = new Map(
    located.map(({ member, number }) => [member.id, number]),
  )
  const pins = spreadOverlappingPins(
    located.map(({ member }) => member),
    toCanvas,
    (pixel) =>
      unproject({ x: pixel.x + origin.x, y: pixel.y + origin.y }, zoom),
  )

  const fill = colorHex(report.district.color)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#111827'
  for (const pin of pins) {
    if (!pin.actual) continue
    const from = toCanvas(pin.actual)
    const to = toCanvas(pin)
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(from.x, from.y, 3, 0, 2 * Math.PI)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.stroke()
  }
  ctx.font = 'bold 12px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const pin of pins) {
    const at = toCanvas(pin)
    ctx.beginPath()
    ctx.arc(at.x, at.y, PIN_RADIUS, 0, 2 * Math.PI)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = '#111827'
    ctx.stroke()
    ctx.fillStyle = textColorOn(fill)
    ctx.fillText(String(numbers.get(pin.member.id) ?? ''), at.x, at.y + 0.5)
  }

  // Required credit for the map data, drawn where Leaflet would show it.
  const credit = '© OpenStreetMap contributors'
  ctx.font = '12px Helvetica, Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  const creditWidth = ctx.measureText(credit).width + 12
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.fillRect(width - creditWidth, height - 20, creditWidth, 20)
  ctx.fillStyle = '#111827'
  ctx.fillText(credit, width - 6, height - 4)

  return canvas.toDataURL('image/jpeg', 0.85)
}

// --- PDF ---------------------------------------------------------------------

const addressOf = (member: MemberDto) =>
  [
    member.address1,
    member.address2,
    [member.city, [member.state, member.postalCode].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', '),
  ]
    .filter(Boolean)
    .join('\n') ||
  member.formattedAddress ||
  ''

const contactLine = (label: string, member?: MemberDto) =>
  `${label}: ${
    member
      ? [displayName(member), member.phone].filter(Boolean).join('  ·  ')
      : 'Not assigned'
  }`

type AutoTable = typeof import('jspdf-autotable').default

// Column widths of the member roster table (#, Name, Address, Phone; the
// Comments column takes what is left).
const MEMBER_COLUMN_STYLES = {
  0: { cellWidth: 24, halign: 'right' },
  1: { cellWidth: 125 },
  2: { cellWidth: 160 },
  3: { cellWidth: 80 },
} as const

const addDistrict = async (
  doc: jsPDF,
  autoTable: AutoTable,
  report: DistrictReport,
  wardName: string,
) => {
  const { district, leader, assistant, members } = report
  const title = district.name ?? 'District'
  const firstPage = doc.getNumberOfPages()

  // Roster page(s): heading, leader/assistant, then one row per member.
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(0)
  doc.text(title, MARGIN, MARGIN + 16)
  doc.setFont('helvetica', 'normal').setFontSize(11)
  doc.text(contactLine('Leader', leader), MARGIN, MARGIN + 38)
  doc.text(contactLine('Assistant', assistant), MARGIN, MARGIN + 54)
  doc.text(`Members: ${members.length}`, MARGIN, MARGIN + 70)

  autoTable(doc, {
    startY: MARGIN + 84,
    margin: TABLE_MARGIN,
    head: [['#', 'Name', 'Address', 'Phone', 'Comments']],
    body: members.map((member, index) => [
      String(index + 1),
      displayName(member) +
        (member.id === district.leaderId
          ? '\n(Leader)'
          : member.id === district.assistantId
            ? '\n(Assistant)'
            : '') +
        (member.lat == null || member.lng == null ? '\n(not on map)' : ''),
      addressOf(member),
      member.phone ?? '',
      member.notes ?? '',
    ]),
    theme: 'grid',
    styles: TABLE_STYLES,
    headStyles: TABLE_HEAD_STYLES,
    columnStyles: MEMBER_COLUMN_STYLES,
    // Keep a household's row together instead of splitting it across pages.
    rowPageBreak: 'avoid',
  })
  if (members.length === 0) {
    doc.setFontSize(10).setTextColor(90)
    doc.text('No members are assigned to this district.', MARGIN, MARGIN + 100)
  }

  // Map page: just this district's members, numbered as in the roster.
  doc.addPage()
  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(0)
  doc.text(`${title} - Map`, MARGIN, MARGIN + 10)
  const mapTop = MARGIN + 22
  const mapHeight = PAGE_HEIGHT - mapTop - MARGIN - 10
  const image = await renderMap(
    report,
    Math.round(CONTENT_WIDTH * MAP_SCALE),
    Math.round(mapHeight * MAP_SCALE),
  )
  if (image) {
    doc.addImage(image, 'JPEG', MARGIN, mapTop, CONTENT_WIDTH, mapHeight)
    doc.setDrawColor(120).rect(MARGIN, mapTop, CONTENT_WIDTH, mapHeight)
  } else {
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(90)
    doc.text(
      'No members in this district have a map location.',
      MARGIN,
      mapTop + 16,
    )
  }

  addFooters(doc, firstPage, [wardName, title])
}

// Stamps "label · label" and "Page x of y" on pages firstPage..last, numbered
// within that section, then leaves the document on its last page.
const addFooters = (doc: jsPDF, firstPage: number, labels: string[]) => {
  const lastPage = doc.getNumberOfPages()
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(110)
  for (let page = firstPage; page <= lastPage; page++) {
    doc.setPage(page)
    doc.text(
      labels.filter(Boolean).join('  ·  '),
      MARGIN,
      PAGE_HEIGHT - MARGIN + 12,
    )
    doc.text(
      `Page ${page - firstPage + 1} of ${lastPage - firstPage + 1}`,
      PAGE_WIDTH - MARGIN,
      PAGE_HEIGHT - MARGIN + 12,
      { align: 'right' },
    )
  }
  doc.setPage(lastPage)
}

const TABLE_MARGIN = {
  left: MARGIN,
  right: MARGIN,
  top: MARGIN,
  bottom: MARGIN + 10,
}
const TABLE_STYLES = {
  fontSize: 9,
  cellPadding: 4,
  valign: 'top',
  textColor: 20,
} as const
const TABLE_HEAD_STYLES = {
  fillColor: [55, 65, 81] as [number, number, number],
  textColor: 255,
}

const contactCell = (member?: MemberDto) =>
  member
    ? [displayName(member), member.phone, addressOf(member)]
        .filter(Boolean)
        .join('\n')
    : 'Not assigned'

// Directory page: every district with its leader's and assistant's contact
// details, so the packet opens with who to call.
const addLeadersPage = (
  doc: jsPDF,
  autoTable: AutoTable,
  reports: DistrictReport[],
  wardName: string,
) => {
  const firstPage = doc.getNumberOfPages()
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(0)
  doc.text('District Leaders', MARGIN, MARGIN + 16)
  doc.setFont('helvetica', 'normal').setFontSize(11)
  doc.text(`Districts: ${reports.length}`, MARGIN, MARGIN + 38)

  autoTable(doc, {
    startY: MARGIN + 52,
    margin: TABLE_MARGIN,
    head: [['District', 'Members', 'Leader', 'Assistant']],
    body: reports.map((report) => [
      report.district.name ?? '',
      String(report.members.length),
      contactCell(report.leader),
      contactCell(report.assistant),
    ]),
    theme: 'grid',
    styles: TABLE_STYLES,
    headStyles: TABLE_HEAD_STYLES,
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 50, halign: 'right' },
    },
    rowPageBreak: 'avoid',
  })
  addFooters(doc, firstPage, [wardName, 'District Leaders'])
}

// Closing page(s): members who aren't in any district, with the same details
// as a district roster.
const addUnassignedPage = (
  doc: jsPDF,
  autoTable: AutoTable,
  members: MemberDto[],
  wardName: string,
) => {
  const firstPage = doc.getNumberOfPages()
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(0)
  doc.text('Not Assigned to a District', MARGIN, MARGIN + 16)
  doc.setFont('helvetica', 'normal').setFontSize(11)
  doc.text(`Members: ${members.length}`, MARGIN, MARGIN + 38)

  if (members.length === 0) {
    doc.setFontSize(10).setTextColor(90)
    doc.text('Every member is assigned to a district.', MARGIN, MARGIN + 60)
  } else {
    autoTable(doc, {
      startY: MARGIN + 52,
      margin: TABLE_MARGIN,
      head: [['#', 'Name', 'Address', 'Phone', 'Comments']],
      body: members.map((member, index) => [
        String(index + 1),
        displayName(member),
        addressOf(member),
        member.phone ?? '',
        member.notes ?? '',
      ]),
      theme: 'grid',
      styles: TABLE_STYLES,
      headStyles: TABLE_HEAD_STYLES,
      columnStyles: MEMBER_COLUMN_STYLES,
      rowPageBreak: 'avoid',
    })
  }
  addFooters(doc, firstPage, [wardName, 'Not Assigned'])
}

// Extra pages for the whole-ward packet.
export type WardPacketExtras = {
  // Members who aren't in any district, listed on the closing page(s).
  unassigned: MemberDto[]
}

/**
 * Builds a PDF with, for each district, its roster (leader, assistant and
 * every member's address, phone and comments) followed by a full-page map of
 * just that district's members. With `extras` (the whole-ward packet) it
 * opens with a directory of district leaders and closes with the members not
 * assigned to any district. `onProgress` is called before each district.
 */
export const generateDistrictsPdf = async (
  reports: DistrictReport[],
  wardName: string,
  onProgress?: (done: number, total: number) => void,
  extras?: WardPacketExtras,
): Promise<Blob> => {
  // Loaded on demand: the PDF library is large and only needed here.
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  if (extras) addLeadersPage(doc, autoTable, reports, wardName)
  for (let i = 0; i < reports.length; i++) {
    onProgress?.(i, reports.length)
    if (i > 0 || extras) doc.addPage()
    await addDistrict(doc, autoTable, reports[i], wardName)
  }
  if (extras) {
    doc.addPage()
    addUnassignedPage(doc, autoTable, extras.unassigned, wardName)
  }
  onProgress?.(reports.length, reports.length)
  return doc.output('blob')
}

/** Starts a browser download of `blob` under `filename`. */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the download a moment to start before releasing the data.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
