export const INDIAN_STATES: readonly string[] = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const STATE_LOOKUP = new Map(INDIAN_STATES.map((s) => [s.toLowerCase().replace(/[^a-z0-9]/g, ''), s]));

export const normalizeStateInput = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
    return STATE_LOOKUP.get(key) ?? null;
};
