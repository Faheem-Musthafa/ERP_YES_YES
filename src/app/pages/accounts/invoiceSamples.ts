import type { InvoiceRenderInput } from './invoiceRenderer';

const SELLER = {
  name: 'YES YES TRADES AND SERVICES LLP',
  addressLines: ['3/67, Main Road,Chenakkal,', 'Malappuram-676510', '9847406444,'],
  phone: 'Contact : +91-9847406444,9037190801',
  pan: 'AACFY2769G',
  gstin: '32AACFY2769G1Z3',
  stateName: 'Kerala',
  stateCode: '32',
  jurisdiction: 'Kozhikkode',
};

// Variant 1 — Normal customer with site address (no IRN, no EWB).
export const buildSampleVariant1 = (): InvoiceRenderInput => ({
  documentLabel: 'TAX INVOICE',
  seller: SELLER,
  consignee: {
    name: 'Artic Engineers, Site@',
    addressLines: ['Moidu, Arakuparamb, Matra, +91 94465 37744'],
    pan: 'ABHFA6996K',
    stateName: 'Kerala',
    stateCode: '32',
  },
  buyer: {
    name: 'Artic Engineers',
    addressLines: [
      'KVR Tower, Near Sree Suma Auditorium,',
      'Rajeev Gandhi Byepass, Manjeri,',
      '9745540506, 04832769955',
    ],
    gstin: '32ABHFA6996K1ZY',
    pan: 'ABHFA6996K',
    stateName: 'Kerala',
    stateCode: '32',
  },
  meta: {
    invoiceNo: 'KG1826270134',
    invoiceDate: '25-Apr-26',
    referenceNoAndDate: 'KG1826270134 dt. 25-Apr-26',
  },
  items: [
    {
      description: 'Mitsubishi Hiwall AC Inv 3* (MSY-JX22)VF',
      hsn: '84151010',
      quantity: 1,
      unit: 'no',
      rate: 21355.93,
      perUnit: 'no',
      discountPct: 18,
      amount: 17511.86,
    },
    {
      description: 'Mitsubishi Hiwall AC Inv 3* (MUY-JX22)VF',
      hsn: '84151010',
      quantity: 1,
      unit: 'no',
      rate: 32033.9,
      perUnit: 'no',
      discountPct: 18,
      amount: 26267.8,
    },
  ],
  totalsLines: [
    { label: 'CGST Collected', ratePct: 9, amount: 3940.17 },
    { label: 'SGST Collected', ratePct: 9, amount: 3940.17 },
  ],
  totalQuantityDisplay: '2.00 no',
  grandTotal: 51660,
  amountInWords: 'Fifty One Thousand Six Hundred Sixty',
  taxAmountInWords: 'INR Seven Thousand Eight Hundred Eighty and Thirty Four paise Only',
  hsnSummary: [
    {
      hsn: '84151010',
      taxableValue: 43779.66,
      cgstRate: 9,
      cgstAmount: 3940.17,
      sgstRate: 9,
      sgstAmount: 3940.17,
    },
  ],
  filename: 'sample-variant-1-normal-with-site.pdf',
});

// Variant 2 — Direct customer + e-Invoice (no EWB).
export const buildSampleVariant2 = (): InvoiceRenderInput => ({
  documentLabel: 'TAX INVOICE',
  seller: SELLER,
  buyer: {
    name: 'NARIKKUNI INSTITUTE OF MEDICAL SERVICES LLP',
    addressLines: [
      'NO.NP/7/577,574,575,576,580,581,582,',
      '583,584, NARIKKUNI, PARANNUR,',
      'Nanmanda, Kozhikode, 08156-967108',
    ],
    gstin: '32AAOFN6159K1ZT',
    pan: 'AAOFN6159K',
    stateName: 'Kerala',
    stateCode: '32',
  },
  meta: {
    invoiceNo: 'CG1826270118',
    invoiceDate: '16-May-26',
    referenceNoAndDate: 'CG1826270118 dt. 16-May-26',
  },
  items: [
    {
      description: 'Mitsubishi Hiwall Ac 1.5 Tr Inv 3Str Idu MSY-JZ18VF-BG1',
      hsn: '84151010',
      quantity: 1,
      unit: 'no',
      rate: 16949.15,
      perUnit: 'no',
      amount: 16949.15,
    },
    {
      description: 'Mitsubishi Hiwall Ac 1.5 Tr Inv 3Str Odu MUY-JZ18VF-BG1',
      hsn: '84151010',
      quantity: 1,
      unit: 'no',
      rate: 25423.72,
      perUnit: 'no',
      amount: 25423.72,
    },
  ],
  totalsLines: [
    { label: 'CGST Collected', ratePct: 9, amount: 3813.55 },
    { label: 'SGST Collected', ratePct: 9, amount: 3813.55 },
    { label: 'Rounded', amount: 0.03 },
  ],
  totalQuantityDisplay: '2.00 no',
  grandTotal: 50000,
  amountInWords: 'Fifty Thousand',
  taxAmountInWords: 'INR Seven Thousand Six Hundred Twenty Seven and Ten paise Only',
  hsnSummary: [
    {
      hsn: '84151010',
      taxableValue: 42372.87,
      cgstRate: 9,
      cgstAmount: 3813.55,
      sgstRate: 9,
      sgstAmount: 3813.55,
    },
  ],
  einvoice: {
    irn: '099707f4968aaf76d2fd582d380c342d78a1c08f0e17310b339a87a57bf855b1',
    ackNo: '152625749302376',
    ackDate: '16-May-26',
    signedQrPayload:
      '{"data":"sample-signed-qr-payload-not-real","note":"replace with NIC signed QR string"}',
  },
  filename: 'sample-variant-2-direct-einvoice.pdf',
});

// Variant 3 — Direct customer + e-Invoice + e-Way Bill.
export const buildSampleVariant3 = (): InvoiceRenderInput => ({
  documentLabel: 'TAX INVOICE',
  seller: SELLER,
  buyer: {
    name: 'Surya Hardware',
    addressLines: ['CP-18/254, CHATHAMANGALAM, Kozhikode, Kerala'],
    gstin: '32DDBPB8033B1ZE',
    pan: 'DDBPB8033B',
    stateName: 'Kerala',
    stateCode: '32',
    phone: '8281623752',
  },
  meta: {
    invoiceNo: 'CG1826270093',
    invoiceDate: '8-May-26',
    referenceNoAndDate: 'CG1826270093 dt. 8-May-26',
  },
  items: [
    { description: 'Bonton Cable 1.0sqmm N-HRFR Red (110267)', hsn: '85446020', quantity: 3, unit: 'cl', rate: 1574.1, perUnit: 'cl', amount: 4722.3 },
    { description: 'Bonton Cable 1.0sqmm N-HRFR Black (110267)', hsn: '85446020', quantity: 4, unit: 'cl', rate: 1574.1, perUnit: 'cl', amount: 6296.4 },
    { description: 'Bonton Cable 1.0sqmm N-HRFR Yellow (110267)', hsn: '85446020', quantity: 1, unit: 'cl', rate: 1574.1, perUnit: 'cl', amount: 1574.1 },
    { description: 'Bonton Cable 1.0sqmm N-HRFR Blue (110267)', hsn: '85446020', quantity: 1, unit: 'cl', rate: 1574.1, perUnit: 'cl', amount: 1574.1 },
    { description: 'Bonton Cable 1.0sqmm N-HRFR Green (110267)', hsn: '85446020', quantity: 1, unit: 'cl', rate: 1574.1, perUnit: 'cl', amount: 1574.1 },
    { description: 'Bonton Cable 2.5sqmm N-HRFR Red (110269)', hsn: '85446020', quantity: 2, unit: 'cl', rate: 3671.94, perUnit: 'cl', amount: 7343.88 },
    { description: 'Bonton Cable 2.5 Sqmm P-Hrfr Yellow (110269)', hsn: '85446020', quantity: 1, unit: 'cl', rate: 5178.31, perUnit: 'cl', amount: 5178.31 },
    { description: 'Bonton Cable 4.0sqmm 200mtrs T-HRFR Red', hsn: '85446020', quantity: 1, unit: 'cl', rate: 10951.92, perUnit: 'cl', amount: 10951.92 },
    { description: 'Bonton Cable 4.0sqmm 200mtrs T-HRFR Black', hsn: '85446020', quantity: 1, unit: 'cl', rate: 10951.92, perUnit: 'cl', amount: 10951.92 },
  ],
  totalsLines: [
    { label: 'CGST Collected', ratePct: 9, amount: 4515.04 },
    { label: 'SGST Collected', ratePct: 9, amount: 4515.04 },
    { label: 'Less : Rounded', amount: -0.11 },
  ],
  totalQuantityDisplay: '1,660.00 mtr',
  grandTotal: 59197,
  amountInWords: 'Fifty Nine Thousand One Hundred Ninety Seven',
  taxAmountInWords: 'INR Nine Thousand Thirty and Eight paise Only',
  hsnSummary: [
    {
      hsn: '85446020',
      taxableValue: 50167.03,
      cgstRate: 9,
      cgstAmount: 4515.04,
      sgstRate: 9,
      sgstAmount: 4515.04,
    },
  ],
  einvoice: {
    irn: '43ca9fd6a2dbf9242c824178e4baf54d4db31b58a719ec0553199de912300c17',
    ackNo: '152625654453473',
    ackDate: '8-May-26',
    signedQrPayload:
      '{"data":"sample-signed-qr-payload-not-real","note":"replace with NIC signed QR string"}',
  },
  ewayBill: {
    ewbNo: '582000951547',
    mode: '1 - Road',
    generatedDate: '8-May-26 10:24 AM',
    validUpto: '9-May-26 11:59 PM',
    approxDistance: 68,
    supplyType: 'Outward-Supply',
    transactionType: 'Regular',
    transporterName: 'RAZAK',
    transporterId: null,
    vehicleNo: 'KL11AZ3761',
    dispatchFrom: '3/67, Main Road,Chenakkal,, Malappuram-676510, KOTTAKKAL Kerala 676510',
    shipTo: 'CP-18/254, CHATHAMANGALAM,, Kozhikode, Kerala chathamangalam Kerala 673601',
  },
  filename: 'sample-variant-3-direct-einvoice-ewb.pdf',
});

export type SampleVariantKey = 'variant1' | 'variant2' | 'variant3';

export const buildSampleByKey = (key: SampleVariantKey): InvoiceRenderInput => {
  switch (key) {
    case 'variant1':
      return buildSampleVariant1();
    case 'variant2':
      return buildSampleVariant2();
    case 'variant3':
      return buildSampleVariant3();
  }
};

export const SAMPLE_VARIANTS: Array<{ key: SampleVariantKey; label: string }> = [
  { key: 'variant1', label: 'Variant 1: Normal customer + site address' },
  { key: 'variant2', label: 'Variant 2: Direct customer + e-Invoice' },
  { key: 'variant3', label: 'Variant 3: Direct customer + e-Invoice + e-Way Bill' },
];
