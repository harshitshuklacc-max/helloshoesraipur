export interface ShoeProduct {
  id: string;
  name: string;
  category: 'Performance Runners' | 'Artisanal Leather' | 'Court & Street' | 'All-Weather Trail';
  price: number;
  material: string;
  originNote: string;
  stockStatus: 'In Stock at Kota Atelier' | 'Limited Batch';
  imageUrl: string;
  colorways: string[];
  sizes: string[];
  weightGrams: number;
  soleSpec: string;
  description: string;
  careGuide: string;
  defaultRating: number;
  defaultReviewCount: number;
}

export const HERO_BANNER_IMAGE = '/src/assets/images/hero_hello_shoes_1791475669426.jpg';

export const STORE_INFO = {
  name: 'Hello Shoes',
  fullName: 'Hello Shoes Raipur',
  addressLine: 'Jagannath Chowk, Kota, Raipur',
  cityStatePin: 'Raipur, Chhattisgarh 492010',
  phoneDisplay: '+91 74704 05204',
  phoneRaw: '7470405204',
  email: 'notifications@helloshoesraipur.in',
  hours: 'Mon – Sun · 10:30 AM to 9:30 PM IST',
  freeShippingThreshold: 2999,
  standardShippingFee: 149,
};

export const SHOE_CATALOG: ShoeProduct[] = [
  {
    id: 'shoe-velocity-runner',
    name: 'Aura Fly-4 Carbon Runner',
    category: 'Performance Runners',
    price: 5499,
    material: 'Engineered Breathable Mesh & FlyFoam',
    originNote: 'Kota Road-Tested Cushioning',
    stockStatus: 'In Stock at Kota Atelier',
    imageUrl: '/src/assets/images/shoe_velocity_runner_1791475682512.jpg',
    colorways: ['Obsidian / Bone White', 'Slate / Volt'],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    weightGrams: 238,
    soleSpec: 'Dual-density FlyFoam midsole with high-abrasion carbon rubber heel strike',
    description:
      'Engineered for humid Central Indian road runs and all-day urban pacing across Raipur. Features a sculpted rocker geometry that reduces ankle fatigue by 28% over 10km.',
    careGuide: 'Brush dry with a soft bristle brush; air-dry in shade away from direct heat.',
    defaultRating: 4.9,
    defaultReviewCount: 42,
  },
  {
    id: 'shoe-heritage-loafer',
    name: 'Jagannath Burnished Penny Loafer',
    category: 'Artisanal Leather',
    price: 6899,
    material: 'Full-Grain Vegetable-Tanned Calfskin',
    originNote: 'Blake-Stitched Leather Outsole',
    stockStatus: 'In Stock at Kota Atelier',
    imageUrl: '/src/assets/images/shoe_heritage_loafer_1791475696849.jpg',
    colorways: ['Hand-Burnished Cognac', 'Dark Espresso'],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'],
    weightGrams: 390,
    soleSpec: 'Stacked leather heel with recessed rubber anti-slip forefoot insert',
    description:
      'Hand-lasted in small batches for formal occasions, weddings, and executive wear. The vegetable-tanned cognac upper develops a rich bespoke patina within weeks of wear.',
    careGuide: 'Condition monthly with neutral beeswax cream and buff with horsehair brush.',
    defaultRating: 4.8,
    defaultReviewCount: 31,
  },
  {
    id: 'shoe-kota-court-high',
    name: 'Kota Architectural Court High',
    category: 'Court & Street',
    price: 5999,
    material: 'Nappa Leather & Sage Italian Suede',
    originNote: 'Ankle-Strap Street Silhouette',
    stockStatus: 'Limited Batch',
    imageUrl: '/src/assets/images/shoe_kota_court_high_1791475708310.jpg',
    colorways: ['Chalk White / Sage Suede', 'Chalk White / Charcoal'],
    sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    weightGrams: 425,
    soleSpec: '32mm vulcanized cup-sole with herringbone court traction',
    description:
      'Inspired by classic 1980s court silhouettes and tailored for contemporary streetwear around NIT & Kota university corridors. Equipped with a brushed brass buckle strap.',
    careGuide: 'Use a suede eraser on sage panels; wipe smooth leather with a damp microfiber cloth.',
    defaultRating: 4.9,
    defaultReviewCount: 27,
  },
  {
    id: 'shoe-chelsea-boot',
    name: 'St. James Espresso Suede Chelsea',
    category: 'Artisanal Leather',
    price: 7499,
    material: 'Water-Repellent Weatherproof Suede',
    originNote: 'Natural Plantation Crepe Sole',
    stockStatus: 'In Stock at Kota Atelier',
    imageUrl: '/src/assets/images/shoe_chelsea_boot_1791475719914.jpg',
    colorways: ['Deep Espresso Suede', 'Raw Tobacco Suede'],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    weightGrams: 460,
    soleSpec: 'Shock-absorbing natural crepe rubber welt with reinforced heel counter',
    description:
      'Constructed from single-piece vamp suede with high-tension elasticized gussets. Effortless slip-on profile that transitions seamlessly from evening gatherings to travel.',
    careGuide: 'Treat with hydrophobic suede mist before monsoon wear; brush nap in one direction.',
    defaultRating: 4.7,
    defaultReviewCount: 19,
  },
  {
    id: 'shoe-trail-trekker',
    name: 'Chhattisgarh Monsoon Trail GTX',
    category: 'All-Weather Trail',
    price: 6299,
    material: 'Ripstop Ballistic Nylon & Terracotta TPU',
    originNote: 'Multi-Directional Vibram-Style Lugs',
    stockStatus: 'In Stock at Kota Atelier',
    imageUrl: '/src/assets/images/shoe_trail_trekker_1791475732798.jpg',
    colorways: ['Charcoal / Terracotta', 'Forest Slate / Ochre'],
    sizes: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
    weightGrams: 345,
    soleSpec: '5mm self-cleaning traction lugs with rock-plate forefoot protection',
    description:
      'Built for wet monsoon pavements in Raipur and weekend treks across Barnawapara and Mainpat. Sealed gusseted tongue locks out rain, mud, and trail debris.',
    careGuide: 'Rinse mud with cold water after trail use; remove insole to dry overnight.',
    defaultRating: 4.9,
    defaultReviewCount: 36,
  },
  {
    id: 'shoe-atelier-duo-pack',
    name: 'Signature Sovereign Derby & Runner Pack',
    category: 'Artisanal Leather',
    price: 8999,
    material: 'Full-Grain Chestnut Calf & Suede Runner',
    originNote: 'Flagship Jagannath Chowk Edition',
    stockStatus: 'Limited Batch',
    imageUrl: '/src/assets/images/hero_hello_shoes_1791475669426.jpg',
    colorways: ['Chestnut Leather / Warm Sand'],
    sizes: ['UK 7', 'UK 8', 'UK 9', 'UK 10'],
    weightGrams: 380,
    soleSpec: 'Goodyear-welted leather heel + dual-chamber air-cushioned runner outsole',
    description:
      'Our flagship collector rotation pairing the hand-burnished Sovereign Derby for boardroom precision with the architectural Sand Runner for off-duty comfort.',
    careGuide: 'Includes cedar shoe trees and dual-sided suede/leather care kit.',
    defaultRating: 5.0,
    defaultReviewCount: 14,
  },
];

export interface CuratedTestimonial {
  id: string;
  authorName: string;
  role: string;
  organization: string;
  productId: string;
  productName: string;
  sizePurchased: string;
  rating: number;
  title: string;
  comment: string;
  dateLabel: string;
}

export const CURATED_TESTIMONIALS: CuratedTestimonial[] = [
  {
    id: 'curated-1',
    authorName: 'Dr. Siddharth Verma',
    role: 'Senior Orthopedic Consultant',
    organization: 'Ramkrishna Care Hospital, Raipur',
    productId: 'shoe-velocity-runner',
    productName: 'Aura Fly-4 Carbon Runner',
    sizePurchased: 'UK 9',
    rating: 5,
    title: 'Zero plantar soreness after 11-hour hospital rounds',
    comment:
      'Before visiting Hello Shoes at Jagannath Chowk, standard running shoes flattened out within four months of daily ward rounds. Switching to the Aura Fly-4 reduced my evening heel fatigue noticeably, and same-day delivery to Shankar Nagar took under 3 hours.',
    dateLabel: 'Verified Purchase · September 2026',
  },
  {
    id: 'curated-2',
    authorName: 'Rohan Deshmukh',
    role: 'Principal Architect',
    organization: 'Studio Axis, Civil Lines Raipur',
    productId: 'shoe-heritage-loafer',
    productName: 'Jagannath Burnished Penny Loafer',
    sizePurchased: 'UK 8',
    rating: 5,
    title: 'True Blake-stitched craftsmanship right here in Kota, Raipur',
    comment:
      'I used to order formal leather loafers from Mumbai boutiques and struggled with sizing returns. Fitting the Jagannath Burnished Penny Loafer locally gave me a glove-like UK 8 fit with zero break-in blisters across 6 site visits a week.',
    dateLabel: 'Verified Purchase · August 2026',
  },
  {
    id: 'curated-3',
    authorName: 'Ananya Baghel',
    role: 'Postgraduate Researcher',
    organization: 'NIT Raipur (Kota Campus)',
    productId: 'shoe-kota-court-high',
    productName: 'Kota Architectural Court High',
    sizePurchased: 'UK 7',
    rating: 5,
    title: 'Walked in from NIT campus, tracked my custom pair on the dashboard',
    comment:
      'Ordered the Chalk White & Sage Court High online with UPI checkout. Every step from atelier inspection at Jagannath Chowk to doorstep handoff triggered an instant email update, and the suede quality outclasses imported high-tops.',
    dateLabel: 'Verified Purchase · October 2026',
  },
];
