// VyGo — static Sri Lanka route geometry (approximate lat/lng).
// Corridors: expressways (E01, E03) + classic national highways (A1, A2, A4, A5, A7, A9).
// Coordinates are approximations, good enough for a corridor overview map.

export const DEFAULT_CENTER = [7.5, 80.6]
export const DEFAULT_ZOOM = 8

// ---------------------------------------------------------------------------
// City markers
// type: 'capital' | 'junction' | 'city'
// ---------------------------------------------------------------------------
export const CITIES = [
  { id: 'colombo-pettah', name: 'Colombo (Pettah)', type: 'capital', coords: [6.9403, 79.8522], note: 'National & commercial capital — main bus terminal hub' },
  { id: 'makumbura', name: 'Makumbura', type: 'junction', coords: [6.8768, 79.9750], note: 'E01 Southern Expressway interchange (Kottawa)' },
  { id: 'kandy', name: 'Kandy', type: 'city', coords: [7.2906, 80.6337], note: 'Hill capital, A1 / A5 junction' },
  { id: 'galle', name: 'Galle', type: 'city', coords: [6.0329, 80.2170], note: 'Southern coastal city, E01 / A2 junction' },
  { id: 'matara', name: 'Matara', type: 'city', coords: [5.9549, 80.5550], note: 'Southern terminus — E01 / A2' },
  { id: 'tangalle', name: 'Tangalle', type: 'city', coords: [6.0245, 80.7988], note: 'E01 (Hambantota extension)' },
  { id: 'hambantota', name: 'Hambantota', type: 'city', coords: [6.1240, 81.1205], note: 'Port city — E01 / A7 junction' },
  { id: 'kataragama', name: 'Kataragama', type: 'city', coords: [6.4187, 81.3350], note: 'Pilgrimage town — E01 / A4 terminus' },
  { id: 'ampara', name: 'Ampara', type: 'city', coords: [7.2975, 81.6822], note: 'Eastern province hub' },
  { id: 'siyambalanduwa', name: 'Siyambalanduwa', type: 'city', coords: [6.9043, 81.4187] },
  { id: 'wellawaya', name: 'Wellawaya', type: 'city', coords: [6.7368, 81.0997], note: 'A4 / A7 junction' },
  { id: 'mattala', name: 'Mattala', type: 'city', coords: [6.2998, 81.1204], note: 'Mattala Rajapaksa Intl. Airport (HRI)' },
  { id: 'badulla', name: 'Badulla', type: 'city', coords: [6.9934, 81.0550], note: 'Uva capital — A5 terminus' },
  { id: 'ella', name: 'Ella', type: 'city', coords: [6.8667, 81.0467], note: 'Hill-country tourist town' },
  { id: 'jaffna', name: 'Jaffna', type: 'city', coords: [9.6615, 80.0255], note: 'Northern capital — A9 terminus' },
  { id: 'vavuniya', name: 'Vavuniya', type: 'city', coords: [8.7514, 80.4971], note: 'Northern gateway on A9' },
  { id: 'anuradhapura', name: 'Anuradhapura', type: 'city', coords: [8.3114, 80.4037], note: 'Sacred city — A9' },
  { id: 'kurunegala', name: 'Kurunegala', type: 'city', coords: [7.4863, 80.3652], note: 'North Western hub — A9' },
  { id: 'matale', name: 'Matale', type: 'city', coords: [7.4683, 80.6214] },
  { id: 'maharagama', name: 'Maharagama', type: 'city', coords: [6.8484, 79.9228] },
  { id: 'kadawatha', name: 'Kadawatha', type: 'junction', coords: [6.9898, 79.9571], note: 'A1 / A9 junction, north of Colombo' },
  { id: 'panadura', name: 'Panadura', type: 'city', coords: [6.7136, 79.9074], note: 'Coastal city on A2' },
  { id: 'katunayake', name: 'Katunayake', type: 'city', coords: [7.1648, 79.8823], note: 'Bandaranaike Intl. Airport (CMB) — E03' },
  { id: 'negombo', name: 'Negombo', type: 'city', coords: [7.2084, 79.8358], note: 'Coastal city near airport' },
  { id: 'trincomalee', name: 'Trincomalee', type: 'city', coords: [8.5874, 81.2152], note: 'Eastern port & naval city' },
  { id: 'polonnaruwa', name: 'Polonnaruwa', type: 'city', coords: [7.9403, 81.0188], note: 'Ancient capital' },
  { id: 'ratnapura', name: 'Ratnapura', type: 'city', coords: [6.7056, 80.3844], note: 'Gem city — A4' },
  { id: 'nuwara-eliya', name: 'Nuwara Eliya', type: 'city', coords: [6.9497, 80.7891], note: 'Hill station — A5' },
  { id: 'middeniya', name: 'Middeniya', type: 'city', coords: [6.2095, 80.7793] },
  { id: 'walasmulla', name: 'Walasmulla', type: 'city', coords: [6.1596, 80.6785] },
  { id: 'beliatta', name: 'Beliatta', type: 'city', coords: [6.0458, 80.7343], note: 'E01 interchange (Hambantota extension)' },
  { id: 'hakmana', name: 'Hakmana', type: 'city', coords: [6.0809, 80.6534] },
  { id: 'embilipitiya', name: 'Embilipitiya', type: 'city', coords: [6.3428, 80.8474], note: 'A4 junction in the deep south' },
  { id: 'rakwana', name: 'Rakwana', type: 'city', coords: [6.5142, 80.5595] },
  { id: 'welimada', name: 'Welimada', type: 'city', coords: [6.9071, 80.8980], note: 'Highlands market town — A5' },
  { id: 'passara', name: 'Passara', type: 'city', coords: [6.9552, 81.1519] },
  { id: 'bibila', name: 'Bibila', type: 'city', coords: [6.7842, 81.1746] },
]

// ---------------------------------------------------------------------------
// Corridors (drawn in array order — classic highways first, expressways on top)
// ---------------------------------------------------------------------------
export const CORRIDORS = [
  {
    id: 'a1',
    code: 'A1',
    name: 'Colombo – Kandy Road',
    color: '#f59e0b', // amber
    weight: 3,
    labelPos: [7.22, 80.45],
    summary: 'Colombo → Kadawatha → Ambepussa → Kegalle → Kandy',
    operators: ['SLTB', 'Singhegiri Transport', 'Namali Travels'],
    points: [
      [6.9403, 79.8522], // Colombo
      [6.9898, 79.9571], // Kadawatha
      [7.1970, 80.1500], // Ambepussa
      [7.2510, 80.3436], // Kegalle
      [7.2650, 80.5940], // Peradeniya
      [7.2906, 80.6337], // Kandy
    ],
  },
  {
    id: 'a9',
    code: 'A9',
    name: 'Kandy / Jaffna Highway (North Road)',
    color: '#f59e0b', // amber
    weight: 3,
    labelPos: [8.55, 80.47],
    summary: 'Colombo → Kurunegala → Dambulla → Anuradhapura → Vavuniya → Jaffna',
    operators: ['SLTB', 'Jaffna Travels', 'SK Sons', 'Liyanage Express'],
    points: [
      [6.9403, 79.8522], // Colombo
      [6.9898, 79.9571], // Kadawatha
      [7.4863, 80.3652], // Kurunegala
      [7.8600, 80.6510], // Dambulla
      [8.3114, 80.4037], // Anuradhapura
      [8.7514, 80.4971], // Vavuniya
      [9.3810, 80.4110], // Kilinochchi
      [9.6615, 80.0255], // Jaffna
    ],
  },
  {
    id: 'a2',
    code: 'A2',
    name: 'Galle Road (Southern Coast)',
    color: '#94a3b8', // slate
    weight: 3,
    labelPos: [6.24, 80.1],
    summary: 'Colombo → Panadura → Kalutara → Galle → Matara',
    operators: ['SLTB', 'Jayalath Traders', 'Maleesha Tours'],
    points: [
      [6.9403, 79.8522], // Colombo
      [6.7136, 79.9074], // Panadura
      [6.5850, 79.9620], // Kalutara
      [6.2350, 80.0550], // Ambalangoda
      [6.1460, 80.1020], // Hikkaduwa
      [6.0329, 80.2170], // Galle
      [5.9549, 80.5550], // Matara
    ],
  },
  {
    id: 'a4',
    code: 'A4',
    name: 'Ratnapura / Buttala Road',
    color: '#94a3b8', // slate
    weight: 3,
    labelPos: [6.45, 80.72],
    summary: 'Avissawella → Ratnapura → Rakwana → Embilipitiya → Kataragama',
    operators: ['SLTB', 'SK Sons', 'Namali Travels'],
    points: [
      [6.9558, 80.2134], // Avissawella
      [6.7056, 80.3844], // Ratnapura
      [6.5142, 80.5595], // Rakwana
      [6.3428, 80.8474], // Embilipitiya
      [6.4660, 80.9680], // Thanamalwila
      [6.4187, 81.3350], // Kataragama
    ],
  },
  {
    id: 'a5',
    code: 'A5',
    name: 'Kandy – Badulla Road (Hill Country)',
    color: '#94a3b8', // slate
    weight: 3,
    labelPos: [6.9, 80.9],
    summary: 'Kandy → Gampola → Nuwara Eliya → Welimada → Ella → Badulla',
    operators: ['SLTB', 'Namunukula Highway Express', 'NCG Express', 'Singhegiri Transport'],
    points: [
      [7.2906, 80.6337], // Kandy
      [7.2650, 80.5940], // Peradeniya
      [7.1650, 80.5700], // Gampola
      [7.0100, 80.5200], // Ginigathena
      [6.9497, 80.7891], // Nuwara Eliya
      [6.9071, 80.8980], // Welimada
      [6.8667, 81.0467], // Ella
      [6.9934, 81.0550], // Badulla
    ],
  },
  {
    id: 'a7',
    code: 'A7',
    name: 'Hambantota – Wellawaya Road',
    color: '#94a3b8', // slate
    weight: 3,
    labelPos: [6.55, 81.2],
    summary: 'Hambantota → Tissamaharama → Wellawaya → Monaragala',
    operators: ['SLTB', 'Maleesha Tours', 'Liyanage Express'],
    points: [
      [6.1240, 81.1205], // Hambantota
      [6.2830, 81.2900], // Tissamaharama
      [6.7368, 81.0997], // Wellawaya
      [6.8726, 81.3497], // Monaragala
    ],
  },
  {
    id: 'e03',
    code: 'E03',
    name: 'Colombo – Katunayake Expressway',
    color: '#38bdf8', // sky
    weight: 5,
    labelPos: [7.1, 79.9],
    summary: 'Colombo (Peliyagoda) → Katunayake (Bandaranaike Intl. Airport)',
    operators: ['Expressway Bus', 'SLTTS Katubadda', 'Dilanka Express'],
    points: [
      [6.9403, 79.8522], // Colombo (Pettah)
      [6.9750, 79.8900], // Peliyagoda / Kerawalapitiya
      [7.09, 79.9], // mid
      [7.1648, 79.8823], // Katunayake
    ],
  },
  {
    id: 'e01',
    code: 'E01',
    name: 'Southern Expressway',
    color: '#10b981', // emerald
    weight: 5,
    labelPos: [6.1, 80.75],
    summary: 'Kottawa → Makumbura → Galle → Matara → Tangalle → Hambantota → Mattala / Kataragama',
    operators: ['Expressway Bus', 'SLTTS Katubadda', 'NCG Express', 'Vishmitha Highway', 'GreenLeaf', 'Jayalath Traders'],
    points: [
      [6.8414, 79.9666], // Kottawa interchange
      [6.8768, 79.975], // Makumbura interchange
      [6.5992, 80.0015], // Dodangoda
      [6.4349, 80.0313], // Kurundugahahetekma
      [6.209, 80.158], // Baddegama
      [6.0329, 80.217], // Galle
      [5.983, 80.39], // near Kokmaduwa
      [5.9549, 80.555], // Matara
      [6.0458, 80.7343], // Beliatta
      [6.0245, 80.7988], // Tangalle
      [6.1126, 81.019], // Ambalantota
      [6.124, 81.1205], // Hambantota
      [6.2998, 81.1204], // Mattala
      [6.4187, 81.335], // Kataragama
    ],
  },
]
