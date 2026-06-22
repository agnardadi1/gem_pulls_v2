export type Rarity = 'common' | 'uncommon' | 'rare' | 'chase'

export interface RealCard {
  id: string
  playerName: string
  team: string
  cardSet: string
  variant: string
  cardNumber?: string
  serialNumber?: string
  grade: string
  rarity: Rarity
  actualEbayPrice: number
  imageUrl: string
}

export const CARDS: RealCard[] = [
  { id: '001', playerName: 'Carmelo Anthony', team: 'DEN', cardSet: '2023 Panini Crown Royale', variant: 'Test of Time - Gold', cardNumber: '3', serialNumber: '10', grade: 'PSA 9', rarity: 'common', actualEbayPrice: 60, imageUrl: '/cards/001.jpg' },
  { id: '002', playerName: "Shaquille O'Neal", team: 'LAL', cardSet: '2004 Fleer Ultra', variant: 'Platinum Medallion', cardNumber: '143', serialNumber: '100', grade: 'PSA 9', rarity: 'rare', actualEbayPrice: 1526, imageUrl: '/cards/002.jpg' },
  { id: '003', playerName: "Shaquille O'Neal", team: 'LAL', cardSet: '2024 Panini Flawless', variant: 'Flawless Performances Auto', serialNumber: '25', grade: 'Ungraded', rarity: 'rare', actualEbayPrice: 645, imageUrl: '/cards/003.jpg' },
  { id: '004', playerName: 'Dwyane Wade', team: 'MIA', cardSet: '2022 Panini Immaculate', variant: 'Virtuoso Autographs Green', serialNumber: '5', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 198, imageUrl: '/cards/004.jpg' },
  { id: '005', playerName: 'Kevin Durant', team: 'PHX', cardSet: '2024 Panini Prizm Deca', variant: 'Signatures Silver Prizm Auto', cardNumber: 'PDS-KDU', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 103, imageUrl: '/cards/005.jpg' },
  { id: '006', playerName: 'Kevin Durant', team: 'OKC', cardSet: '2013 Panini Select', variant: 'Purple Pulsar Prizm', cardNumber: '136', grade: 'PSA 9', rarity: 'common', actualEbayPrice: 53.5, imageUrl: '/cards/006.jpg' },
  { id: '007', playerName: 'Stephen Curry', team: 'GSW', cardSet: '2023 Panini Court Kings', variant: 'Blank Slate', cardNumber: '6', grade: 'PSA 8', rarity: 'rare', actualEbayPrice: 504, imageUrl: '/cards/007.jpg' },
  { id: '008', playerName: 'Stephen Curry', team: 'GSW', cardSet: '2013 Panini Select', variant: 'Blue Prizm (Color Match Grail)', cardNumber: '86', serialNumber: '49', grade: 'Ungraded', rarity: 'rare', actualEbayPrice: 2075, imageUrl: '/cards/008.jpg' },
  { id: '009', playerName: 'Luka Doncic', team: 'DAL', cardSet: '2021 Panini Flawless', variant: 'Diamond Gem Gold', cardNumber: '77', serialNumber: '10', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 343, imageUrl: '/cards/009.jpg' },
  { id: '010', playerName: 'Giannis Antetokounmpo', team: 'MIL', cardSet: '2023 Panini Flawless', variant: 'Jumbo 3 Color Game Used Patch', serialNumber: '20', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 280, imageUrl: '/cards/010.jpg' },
  { id: '011', playerName: 'Giannis Antetokounmpo', team: 'MIL', cardSet: '2019 Panini Spectra', variant: 'Universal Die-Cut', cardNumber: '34', serialNumber: '8', grade: 'PSA 9', rarity: 'common', actualEbayPrice: 100, imageUrl: '/cards/011.jpg' },
  { id: '012', playerName: 'Victor Wembanyama', team: 'SAS', cardSet: '2023 Panini Court Kings', variant: 'Rookies II (RC)', cardNumber: '106', grade: 'PSA 10', rarity: 'rare', actualEbayPrice: 515, imageUrl: '/cards/012.jpg' },
  { id: '013', playerName: 'Anthony Edwards', team: 'MIN', cardSet: '2020 Panini Crown Royale', variant: 'Kaboom! SSP RC Vertical Rookie', cardNumber: '21', grade: 'Ungraded', rarity: 'rare', actualEbayPrice: 3816, imageUrl: '/cards/013.jpg' },
  { id: '014', playerName: 'Kareem Abdul Jabbar', team: 'LAL', cardSet: '2010 Panini Gold Standard', variant: 'Gold Rings Patch Auto', cardNumber: '15', serialNumber: '5', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 395, imageUrl: '/cards/014.jpg' },
  { id: '015', playerName: 'Kobe Bryant', team: 'LAL', cardSet: '2017 Panini Select', variant: 'Signatures On-Card Auto', cardNumber: 'KB', serialNumber: '49', grade: 'PSA 8', rarity: 'chase', actualEbayPrice: 5500, imageUrl: '/cards/015.jpg' },
  { id: '016', playerName: 'Kobe Bryant', team: 'LAL', cardSet: '2019 Panini Select', variant: 'In Flight Signatures Neon Green Prizm', cardNumber: 'IF-KBR', serialNumber: '49', grade: 'PSA 9', rarity: 'chase', actualEbayPrice: 17500, imageUrl: '/cards/016.jpg' },
  { id: '017', playerName: 'Michael Jordan', team: 'CHI', cardSet: '1999 Upper Deck Black Diamond', variant: 'Jordan Diamond Gallery Holo Refractor', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 158, imageUrl: '/cards/017.jpg' },
  { id: '018', playerName: 'Michael Jordan', team: 'CHI', cardSet: '1997 Fleer Ultra', variant: 'Gold Medallion SSP Variation', cardNumber: '23G', grade: 'Ungraded', rarity: 'rare', actualEbayPrice: 639, imageUrl: '/cards/018.jpg' },
  { id: '019', playerName: 'Kobe Bryant', team: 'LAL', cardSet: '2004 Fleer Ultra', variant: 'Gold Medallion SSP Variation Foil Die Cut', cardNumber: '8', grade: 'Ungraded', rarity: 'common', actualEbayPrice: 81, imageUrl: '/cards/019.jpg' },
  { id: '020', playerName: 'Allen Iverson', team: 'PHI', cardSet: '1998 Fleer Ultra', variant: 'Gold Medallion SSP Variation', cardNumber: '33G', grade: 'Ungraded', rarity: 'common', actualEbayPrice: 30, imageUrl: '/cards/020.jpg' },
  { id: '021', playerName: 'Jason Williams', team: 'MEM', cardSet: '2022 Panini Flawless', variant: 'Flawless Finishes Auto', cardNumber: 'FF-JWL', grade: 'Ungraded', rarity: 'common', actualEbayPrice: 67, imageUrl: '/cards/021.jpg' },
  { id: '022', playerName: 'Dirk Nowitzki', team: 'DAL', cardSet: '2016 Panini National Treasures', variant: 'Portraits GOLD Auto', cardNumber: '51', serialNumber: '10', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 285, imageUrl: '/cards/022.jpg' },
  { id: '023', playerName: 'Clyde Drexler', team: 'POR', cardSet: '2022 Panini NBA National Treasures', variant: 'Greats Signatures SSP', serialNumber: '10', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 114, imageUrl: '/cards/023.jpg' },
  { id: '024', playerName: 'Larry Bird', team: 'BOS', cardSet: '2021 Panini Eminence', variant: 'Hall Of Fame Auto Patch Jersey Gold', serialNumber: '5', grade: 'Ungraded', rarity: 'rare', actualEbayPrice: 861, imageUrl: '/cards/024.jpg' },
  { id: '025', playerName: 'Jalen Duren', team: 'DET', cardSet: '2022 Panini Immaculate Collection', variant: 'Rookie Red Patch Auto RPA (RC)', cardNumber: '103', serialNumber: '49', grade: 'Ungraded', rarity: 'common', actualEbayPrice: 91, imageUrl: '/cards/025.jpg' },
  { id: '026', playerName: 'VJ Edgecombe', team: 'PHI', cardSet: '2025 Panini Signature Series', variant: 'Rookie Patch RC Auto RPA', serialNumber: '25', grade: 'Ungraded', rarity: 'rare', actualEbayPrice: 520, imageUrl: '/cards/026.jpg' },
  { id: '027', playerName: 'Russell Westbrook', team: 'OKC', cardSet: '2018 Panini Rewards Kaboom!', variant: "Kaboom! 1st", cardNumber: 'K-RWS', grade: 'PSA 10', rarity: 'rare', actualEbayPrice: 1775, imageUrl: '/cards/027.jpg' },
  { id: '028', playerName: 'Tim Duncan', team: 'SAS', cardSet: '2024 Panini Noir', variant: 'Critically Acclaimed Holo Gold FOTL', cardNumber: '300', serialNumber: '8', grade: 'PSA 9', rarity: 'uncommon', actualEbayPrice: 173, imageUrl: '/cards/028.jpg' },
  { id: '029', playerName: 'LaMelo Ball', team: 'CHA', cardSet: '2023 Panini Select', variant: 'Mezzanine Tiger Prizm SSP', cardNumber: '348', grade: 'PSA 10', rarity: 'uncommon', actualEbayPrice: 170, imageUrl: '/cards/029.jpg' },
  { id: '030', playerName: 'Gheorghe Muresan', team: 'WAS', cardSet: '1996 Flair Showcase', variant: 'Legacy Collection Row 0', cardNumber: '43', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 202, imageUrl: '/cards/030.jpg' },
  { id: '032', playerName: 'Chris Paul', team: 'GSW', cardSet: '2005 eTOPPS', variant: 'Base', cardNumber: '46', grade: 'PSA 9', rarity: 'common', actualEbayPrice: 31, imageUrl: '/cards/032.jpg' },
  { id: '033', playerName: 'Jalen Duren', team: 'DET', cardSet: '2024 Panini Prizm Black Basketball', variant: 'Silver Auto', cardNumber: '190', grade: 'PSA 10', rarity: 'uncommon', actualEbayPrice: 129, imageUrl: '/cards/033.jpg' },
  { id: '034', playerName: 'Gheorghe Muresan', team: 'WAS', cardSet: '2024-25 Mosaic Scripts Fluorescent Orange Prizm', variant: 'Fluorescent Orange Prizm Auto', cardNumber: '17', serialNumber: '/25', grade: 'Ungraded', rarity: 'common', actualEbayPrice: 30, imageUrl: '/cards/034.jpg' },
  { id: '035', playerName: 'Anthony Edwards', team: 'MIN', cardSet: '2023-24 Panini Prizm Deca', variant: 'Brilliance Prisms Silver', cardNumber: '7', grade: 'PSA 10', rarity: 'uncommon', actualEbayPrice: 150, imageUrl: '/cards/035.jpg' },
  { id: '036', playerName: 'Dwyane Wade', team: 'MIA', cardSet: '2024-25 Panini One', variant: 'Purple', serialNumber: '/25', grade: 'Ungraded', rarity: 'common', actualEbayPrice: 60, imageUrl: '/cards/036.jpg' },
  { id: '037', playerName: "Shaquille O'Neal", team: 'LAL', cardSet: '2013-14 Panini Gold Standard', variant: '2002 Finals Gold', serialNumber: '/20', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 239, imageUrl: '/cards/037.jpg' },
  { id: '038', playerName: 'Victor Wembanyama', team: 'SAS', cardSet: '2024-25 Panini Revolution Basketball', variant: 'Teal Swirl', cardNumber: '79', serialNumber: '/49', grade: 'Ungraded', rarity: 'common', actualEbayPrice: 55, imageUrl: '/cards/038.jpg' },
  { id: '039', playerName: 'Jalen Duren', team: 'DET', cardSet: '2023 Panini Prizm Basketball', variant: 'Gold Shimmer', cardNumber: '210', serialNumber: '1/10', grade: 'BGS 9.5', rarity: 'uncommon', actualEbayPrice: 249, imageUrl: '/cards/039.jpg' },
  { id: '040', playerName: 'DeAndre Jordan', team: 'LAC', cardSet: '2014-15 Panini Prizm Basketball', variant: 'Red Pulsar Prizm', cardNumber: '41', serialNumber: '/25', grade: 'PSA 10', rarity: 'common', actualEbayPrice: 49, imageUrl: '/cards/040.jpg' },
  { id: '041', playerName: 'Patrick Ewing', team: 'NYK', cardSet: '2023 Panini Prizm Basketball', variant: 'Gold Shimmer', cardNumber: '188', serialNumber: '/10', grade: 'PSA 10', rarity: 'uncommon', actualEbayPrice: 224, imageUrl: '/cards/041.jpg' },
  { id: '042', playerName: 'Ausar Thompson', team: 'DET', cardSet: '2023 Panini Immaculate', variant: 'RC Auto', grade: 'PSA 9', rarity: 'uncommon', actualEbayPrice: 109, imageUrl: '/cards/042.jpg' },
  { id: '043', playerName: 'Julius Erving', team: 'PHI', cardSet: '2024-25 Panini Flawless', variant: 'Gold', cardNumber: '100', serialNumber: '/10', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 169, imageUrl: '/cards/043.jpg' },
  { id: '044', playerName: 'James Worthy', team: 'LAL', cardSet: '2013 Panini Prizm Basketball', variant: 'Orange Prizm', cardNumber: '252', serialNumber: '/60', grade: 'PSA 10', rarity: 'uncommon', actualEbayPrice: 89, imageUrl: '/cards/044.jpg' },
  { id: '045', playerName: 'Giannis Antetokounmpo', team: 'MIL', cardSet: '2020 Panini Select Basketball', variant: 'Red Disco Select', cardNumber: '224', serialNumber: '/49', grade: 'PSA 10', rarity: 'uncommon', actualEbayPrice: 85, imageUrl: '/cards/045.jpg' },
  { id: '046', playerName: 'Stephen Curry', team: 'GSW', cardSet: '2024 Panini Select Basketball', variant: 'Purple Prizm', cardNumber: '143', serialNumber: '/99', grade: 'PSA 10', rarity: 'uncommon', actualEbayPrice: 115, imageUrl: '/cards/046.jpg' },
  { id: '047', playerName: 'Tony Parker', team: 'SAS', cardSet: 'Panini National Treasures Greatest Signatures Basketball', variant: 'Base', serialNumber: '/35', grade: 'Ungraded', rarity: 'uncommon', actualEbayPrice: 99, imageUrl: '/cards/047.jpg' },
  { id: '048', playerName: 'Allen Iverson', team: 'PHI', cardSet: '2013-14 Panini Flawless Basketball', variant: 'All-Star Achievements', serialNumber: '/20', grade: 'Ungraded', rarity: 'rare', actualEbayPrice: 598, imageUrl: '/cards/048.jpg' },
  { id: '049', playerName: 'Allen Iverson', team: 'PHI', cardSet: '2004-05 Skybox E-XL', variant: 'Exceptional XL', cardNumber: '7', grade: 'PSA 9', rarity: 'rare', actualEbayPrice: 799, imageUrl: '/cards/049.jpg' },
  { id: '050', playerName: 'Jason Kidd', team: 'PHX', cardSet: '1999-00 Topps Gold Label', variant: 'Class 3 Black Label', cardNumber: '31', grade: 'PSA 10', rarity: 'rare', actualEbayPrice: 399, imageUrl: '/cards/050.jpg' },
  { id: '051', playerName: 'Victor Wembanyama', team: 'SAS', cardSet: '2023-24 Panini Mosaic Basketball', variant: 'Notoriety Purple', cardNumber: '5', serialNumber: '/99', grade: 'PSA 10', rarity: 'rare', actualEbayPrice: 1600, imageUrl: '/cards/051.jpg' },
  { id: '052', playerName: 'Larry Bird', team: 'BOS', cardSet: '2024 Flawless Performances Auto', variant: 'Base', serialNumber: '/25', grade: 'PSA 10', rarity: 'rare', actualEbayPrice: 999, imageUrl: '/cards/052.jpg' },
  { id: '053', playerName: 'Stephen Curry', team: 'GSW', cardSet: '2022 Flawless NBA Ink', variant: 'Base', serialNumber: '/25', grade: 'PSA 10', rarity: 'chase', actualEbayPrice: 5999, imageUrl: '/cards/053.jpg' },
  { id: '054', playerName: 'Kareem Abdul-Jabbar', team: 'LAL', cardSet: '2013-14 Panini Flawless Basketball', variant: 'Gold', serialNumber: '/5', grade: 'BGS 9.5', rarity: 'chase', actualEbayPrice: 6400, imageUrl: '/cards/054.jpg' },
  { id: '055', playerName: 'Anthony Davis', team: 'NOP', cardSet: '2012-13 Panini Flawless Basketball', variant: 'Base', cardNumber: '42', serialNumber: '/10', grade: 'BGS 9.5', rarity: 'chase', actualEbayPrice: 3500, imageUrl: '/cards/055.jpg' },
  { id: '056', playerName: 'Joel Embiid', team: 'PHI', cardSet: '2014-15 Immaculate Collection Basketball', variant: 'Auto Patch Rookie', serialNumber: '/99', grade: 'BGS 9', rarity: 'rare', actualEbayPrice: 749.99, imageUrl: '/cards/056.jpg' },
]

export interface PackType {
  id: string
  name: string
  subtitle: string
  price: number
  cardCount: number
  image: string
  color: [string, string]
  accent: string
  odds: { common: number; uncommon: number; rare: number; chase: number }
}

export const PACK_TYPES: PackType[] = [
  {
    id: 'single',
    name: 'Blind Slab',
    subtitle: '1 card · Commons only',
    price: 50,
    cardCount: 1,
    image: '/pack-single.png',
    color: ['#0f172a', '#1e293b'],
    accent: '#94a3b8',
    odds: { common: 92, uncommon: 8, rare: 0, chase: 0 },
  },
  {
    id: 'budget',
    name: 'Blaster Box',
    subtitle: '3 cards · No rares',
    price: 100,
    cardCount: 3,
    image: '/pack-budget.png',
    color: ['#1e3a5f', '#1e40af'],
    accent: '#60a5fa',
    odds: { common: 75, uncommon: 25, rare: 0, chase: 0 },
  },
  {
    id: 'standard',
    name: 'Hobby Box',
    subtitle: '5 cards · Rares unlocked',
    price: 500,
    cardCount: 5,
    image: '/pack-standard.png',
    color: ['#431407', '#b45309'],
    accent: '#fbbf24',
    odds: { common: 60, uncommon: 25, rare: 15, chase: 0 },
  },
  {
    id: 'premium',
    name: 'Super Box',
    subtitle: '8 cards · Premium rares',
    price: 2500,
    cardCount: 8,
    image: '/pack-premium.png',
    color: ['#2e1065', '#6d28d9'],
    accent: '#c084fc',
    odds: { common: 45, uncommon: 30, rare: 25, chase: 0 },
  },
  {
    id: 'chase',
    name: 'Chase Pack',
    subtitle: '2 cards · Chase possible',
    price: 3500,
    cardCount: 2,
    image: '/pack-chase.png',
    color: ['#0a0a0a', '#18181b'],
    accent: '#ffd700',
    odds: { common: 10, uncommon: 25, rare: 50, chase: 15 },
  },
]

export const RARITY_META: Record<Rarity, { label: string; color: string; textColor: string; glow: string }> = {
  common: { label: 'Common', color: '#1e293b', textColor: '#94a3b8', glow: 'none' },
  uncommon: { label: 'Uncommon', color: '#1e3a5f', textColor: '#60a5fa', glow: '0 0 10px rgba(96,165,250,0.4)' },
  rare: { label: 'Rare', color: '#3b1515', textColor: '#f87171', glow: '0 0 14px rgba(248,113,113,0.5)' },
  chase: { label: 'Chase', color: '#1a1200', textColor: '#ffd700', glow: '0 0 20px rgba(255,215,0,0.7)' },
}

function rollRarity(odds: PackType['odds']): Rarity {
  const r = Math.random() * 100
  if (r < odds.chase) return 'chase'
  if (r < odds.chase + odds.rare) return 'rare'
  if (r < odds.chase + odds.rare + odds.uncommon) return 'uncommon'
  return 'common'
}

function pickCard(rarity: Rarity, exclude: string[]): RealCard {
  const pool = CARDS.filter(c => c.rarity === rarity && !exclude.includes(c.id))
  if (!pool.length) {
    // Fallback: pick any card not in exclude
    const fallback = CARDS.filter(c => !exclude.includes(c.id))
    return fallback[Math.floor(Math.random() * fallback.length)] ?? CARDS[0]
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

export function openPack(pack: PackType): RealCard[] {
  const pulled: RealCard[] = []
  const usedIds: string[] = []
  for (let i = 0; i < pack.cardCount; i++) {
    const rarity = rollRarity(pack.odds)
    const card = pickCard(rarity, usedIds)
    pulled.push(card)
    usedIds.push(card.id)
  }
  return pulled
}
