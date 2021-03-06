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

export interface IVehicleType {
  id: number;
  make: string;
  model: string;
  age: number;
}

export type IVehicleTypePreview = Omit<IVehicleType, 'id'>;