export const APP_NAME = 'Assured Trade'
export const APP_DESCRIPTION =
  'Assured Trade Deal Desk — Case-managed commodity trade platform'

export const COMMODITIES = [
  'sesame',
  'chilli',
  'shea_butter',
  'cocoa',
] as const
export type Commodity = (typeof COMMODITIES)[number]

export const INCOTERMS = [
  'EXW',
  'FCA',
  'FAS',
  'FOB',
  'CFR',
  'CIF',
  'CPT',
  'CIP',
  'DAP',
  'DPU',
  'DDP',
] as const

export const UNITS = ['MT', 'KG', 'LBS', 'BAGS'] as const

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export const MILESTONE_TEMPLATES = {
  default: [
    { name: 'Supplier Assignment', sequence: 1 },
    { name: 'Lot Allocation', sequence: 2 },
    { name: 'Document Collection', sequence: 3 },
    { name: 'Document Review', sequence: 4 },
    { name: 'Pre-Shipment Inspection', sequence: 5 },
    { name: 'Shipping & Logistics', sequence: 6 },
    { name: 'Arrival & Clearance', sequence: 7 },
    { name: 'Final Documentation', sequence: 8 },
    { name: 'Close-out Pack', sequence: 9 },
    { name: 'Case Completion', sequence: 10 },
  ],
} as const

export const DOCUMENT_CHECKLIST = {
  default: [
    { type: 'COO', name: 'Certificate of Origin', required: true },
    { type: 'COA', name: 'Certificate of Analysis', required: true },
    { type: 'PHYTO', name: 'Phytosanitary Certificate', required: true },
    { type: 'PACKING_LIST', name: 'Packing List', required: true },
    { type: 'BILL_OF_LADING', name: 'Bill of Lading', required: true },
    {
      type: 'FUMIGATION_CERT',
      name: 'Fumigation Certificate',
      required: false,
    },
    {
      type: 'COMMERCIAL_INVOICE',
      name: 'Commercial Invoice',
      required: true,
    },
  ],
} as const
