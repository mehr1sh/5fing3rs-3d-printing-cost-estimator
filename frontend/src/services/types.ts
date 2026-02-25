export interface User {
  id: number;
  username: string;
  email?: string;
  role: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Job {
  job_id: string;
  filename: string;
  original_filename: string;
  status: string;
  file_size: number;
  created_at: string;
  updated_at?: string;
  slicing_result?: SlicingResult;
}

export interface SlicingResult {
  job_id: string;
  gcode_path?: string;
  print_time_seconds?: number;
  material_volume_mm3?: number;
  material_weight_grams?: number;
  support_material_grams?: number;
  layer_count?: number;
  estimated_cost?: number;
  slicing_parameters?: any;
  created_at: string;
}

export interface SlicingParams {
  material: 'PLA' | 'ABS' | 'PETG' | 'TPU';
  layerHeight: number;
  infillDensity: number;
  infillPattern: 'grid' | 'lines' | 'triangles' | 'cubic' | 'gyroid';
  wallThickness: number;
  topBottomLayers: number;
  supportEnabled: boolean;
  supportType: 'none' | 'touching_buildplate' | 'everywhere';
  supportDensity: number;
  printSpeed: number;
  buildPlateAdhesion: 'none' | 'skirt' | 'brim' | 'raft';
  nozzleTemp: number;
  bedTemp: number;
}

export interface CostEstimate {
  job_id: string;
  material_cost: number;
  support_cost: number;
  machine_cost: number;
  subtotal: number;
  waste_overhead: number;
  failure_overhead: number;
  total_cost: number;
  currency: string;
  breakdown: {
    material_weight_grams: number;
    print_time_hours: number;
    layer_count: number;
  };
}

export interface Material {
  id: number;
  name: string;
  density_g_cm3: number;
  cost_per_gram: number;
  created_at: string;
}
