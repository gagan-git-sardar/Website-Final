// Helper to generate mock data for postcode districts
// In a real app, this would be a large JSON or database result

const crimeRates = {
    'AB': 0.1, 'AL': 0.2, 'B': 0.6, 'BA': 0.3, 'BB': 0.4, 'BD': 0.5, 'BH': 0.2, 'BL': 0.4, 'BN': 0.3, 'BR': 0.3, 'BS': 0.5, 'BT': 0.4, 'CA': 0.2, 'CB': 0.3, 'CF': 0.4, 'CH': 0.3, 'CM': 0.2, 'CO': 0.2, 'CR': 0.5, 'CT': 0.3, 'CV': 0.4, 'CW': 0.3, 'DA': 0.4, 'DD': 0.4, 'DE': 0.4, 'DG': 0.1, 'DH': 0.3, 'DL': 0.2, 'DN': 0.4, 'DT': 0.2, 'DY': 0.4, 'E': 0.7, 'EC': 0.5, 'EH': 0.4, 'EN': 0.4, 'EX': 0.2, 'FK': 0.3, 'FY': 0.5, 'G': 0.6, 'GL': 0.2, 'GU': 0.2, 'HA': 0.3, 'HD': 0.4, 'HG': 0.2, 'HP': 0.2, 'HR': 0.2, 'HS': 0.1, 'HU': 0.5, 'HX': 0.4, 'IG': 0.4, 'IP': 0.2, 'IV': 0.1, 'KA': 0.3, 'KT': 0.2, 'KW': 0.1, 'KY': 0.3, 'L': 0.6, 'LA': 0.2, 'LD': 0.1, 'LE': 0.5, 'LL': 0.1, 'LN': 0.3, 'LS': 0.5, 'LU': 0.5, 'M': 0.6, 'ME': 0.4, 'MK': 0.3, 'ML': 0.3, 'N': 0.6, 'NE': 0.5, 'NG': 0.5, 'NN': 0.4, 'NP': 0.4, 'NR': 0.3, 'NW': 0.6, 'OL': 0.5, 'OX': 0.3, 'PA': 0.3, 'PE': 0.3, 'PH': 0.2, 'PL': 0.4, 'PO': 0.3, 'PR': 0.4, 'RG': 0.3, 'RH': 0.3, 'RM': 0.4, 'S': 0.5, 'SA': 0.3, 'SE': 0.6, 'SG': 0.2, 'SK': 0.4, 'SL': 0.3, 'SM': 0.3, 'SN': 0.2, 'SO': 0.4, 'SP': 0.2, 'SR': 0.4, 'SS': 0.3, 'ST': 0.5, 'SW': 0.6, 'SY': 0.2, 'TA': 0.2, 'TD': 0.1, 'TF': 0.3, 'TN': 0.2, 'TQ': 0.3, 'TR': 0.2, 'TS': 0.5, 'TW': 0.3, 'UB': 0.4, 'W': 0.7, 'WA': 0.4, 'WC': 0.6, 'WD': 0.3, 'WF': 0.4, 'WN': 0.4, 'WR': 0.2, 'WS': 0.4, 'WV': 0.5, 'YO': 0.2, 'ZE': 0.1
};

// Base prices for broader areas to create realistic variation
const basePrices = {
    'EC': 1500000, 'WC': 1400000, 'W': 1300000, 'SW': 1100000,
    'NW': 900000, 'N': 750000, 'E': 600000, 'SE': 650000,
    'KT': 800000, 'TW': 700000, 'HA': 600000, 'UB': 500000,
    'EN': 550000, 'IG': 500000, 'RM': 450000, 'DA': 400000,
    'BR': 600000, 'CR': 500000, 'SM': 550000
};

function getMockData(postcode) {
    // Extract area code (e.g., 'SW' from 'SW1A') or hash for Full Borough Names
    let area = 'E'; // Default fall back
    const match = postcode.match(/^[A-Z]+/);
    if (match) {
        area = match[0];
    } else {
        // Handle borough names like "Westminster" -> assign pseudo-random area code from keys
        const keys = Object.keys(basePrices);
        area = keys[postcode.length % keys.length];
    }

    const basePrice = basePrices[area] || 600000;

    // Add randomness based on postcode length/chars hash-ish
    const modifier = (postcode.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 100) / 100; // 0.00 to 0.99 

    // Wider variance: 0.5x to 1.5x
    const priceFactor = 0.5 + modifier;
    const avgPrice = Math.round(basePrice * priceFactor);

    return {
        prices: {
            2023: {
                detached: Math.round(avgPrice * 1.5),
                semi: Math.round(avgPrice * 1.1),
                terraced: Math.round(avgPrice * 0.9),
                flat: Math.round(avgPrice * 0.6)
            },
            2024: {
                detached: Math.round(avgPrice * 1.55),
                semi: Math.round(avgPrice * 1.15),
                terraced: Math.round(avgPrice * 0.95),
                flat: Math.round(avgPrice * 0.65)
            },
            2025: {
                detached: Math.round(avgPrice * 1.6),
                semi: Math.round(avgPrice * 1.2),
                terraced: Math.round(avgPrice * 1.0),
                flat: Math.round(avgPrice * 0.7)
            },
            2026: {
                detached: Math.round(avgPrice * 1.65),
                semi: Math.round(avgPrice * 1.25),
                terraced: Math.round(avgPrice * 1.05),
                flat: Math.round(avgPrice * 0.75)
            }
        },
        crime: Math.min(1, Math.max(0, (crimeRates[area] || 0.4) + (Math.random() * 0.2 - 0.1))),
        central: area === 'EC' || area === 'WC' ? 0.9 : area === 'W' || area === 'SW' ? 0.7 : 0.4 - (Math.random() * 0.2),
        culture: Math.min(1, Math.max(0, 0.5 + (Math.random() * 0.4 - 0.2))),
        summary: `Property market in ${postcode} showing ${modifier > 0.3 ? 'strong growth' : 'stable trends'}.`
    };
}
