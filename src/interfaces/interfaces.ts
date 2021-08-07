export interface IVehicleEntry {
  id: number;
  platform: string;
  platformId: string;
  link: string;
};

export interface IVehicleSpec {
  id: number;
  km?: number;
  kw?: number;
  fuel?: string;
  transmission?: string;
  ccm?: number;
  price?: number;
  city?: string;
  zipcode?: number;
};

export interface IVehicleAlertFilters {
  id: number;
  zipcodes?: number[];
  agemax?: number;
  agemin?: number;
  ccmmax?: number;
  ccmmin?: number;
  kmmax?: number;
  kmmin?: number;
  kwmax?: number;
  kwmin?: number;
  fuel?: string;
  transmission?: string;
  pricemax?: number;
  pricemin?: number;
  make?: string;
  model?: string;
}

export interface IVehicleType {
  id: number;
  make: string;
  model: string;
  age: number;
}

export type IVehicleTypePreview = Omit<IVehicleType, 'id'>;

export type IVehicleFullData = IVehicleSpec & IVehicleType & {cartype: number}