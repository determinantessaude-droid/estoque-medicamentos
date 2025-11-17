export interface Medication {
  id: string;
  name: string;
  activeIngredient: string;
  manufacturer: string;
  class: string;
  quantity: number;
  expirationDate: string; // YYYY-MM-DD
  mechanismOfAction: string;
  barcode: string;
  pmc: number;
  presentation: string;
  officeNumber?: string;
  userId: string;
}