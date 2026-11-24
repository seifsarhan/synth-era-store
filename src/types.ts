export type GarmentCategory = 'hoodies' | 'jackets' | 'pants' | 'tshirts';
export type ClimateMood = 'all' | 'subzero' | 'rain' | 'night' | 'studio';
export type GarmentSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type FitStyle = 'sculpted' | 'regular' | 'oversized';

export interface ProductColorway {
  id: string;
  name: string;
  hex: string;
  glowHex: string;
  mode: 'original' | 'recolor';
  dyeRgb?: [number, number, number];
  gamma?: number;
}

export interface ProductTelemetry {
  waterproof: number;    // 0-100
  thermal: number;       // 0-100
  breathability: number; // 0-100
  flex: number;          // 0-100
  gsm: number;
  tempRange: string;
}

export interface Product {
  id: string;
  code: string;
  designId: string;
  name: string;
  subtitle: string;
  category: GarmentCategory;
  price: number;
  preorderPrice?: number;
  badge: string;
  smartTech: string;
  image: string;
  description: string;
  moods: ClimateMood[];
  colorways: ProductColorway[];
  telemetry: ProductTelemetry;
}

export interface CartItem {
  key: string;
  product: Product;
  size: GarmentSize;
  colorway: ProductColorway;
  quantity: number;
}

export interface SmartFitProfile {
  heightCm: number;
  weightKg: number;
  fitStyle: FitStyle;
  recommendedSize: GarmentSize;
  matchScore: number;
  locked: boolean;
}
