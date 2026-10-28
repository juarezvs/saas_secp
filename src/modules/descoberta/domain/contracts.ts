export type DiscoveryAgent = {
  id: string;
  name: string;
  orgao_id: string;
  unidade_id: string | null;
  network_ids: string[];
  state: string;
  version: string;
  heartbeat: number;
  token_expires: number;
  health: {
    interfaces?: Array<{ name: string; ip: string; netmask: string }>;
    capabilities?: string[];
  };
};
export type DiscoveryNetwork = {
  id: string;
  name: string;
  orgao_id: string;
  unidade_id: string | null;
  cidr: string;
  enabled: boolean;
  config: {
    ports: number[];
    methods: string[];
    concurrency: number;
    rate: number;
    timeout: number;
    max_hosts: number;
    window_start_utc: number | null;
    window_end_utc: number | null;
  };
};
export type DiscoveryJob = {
  id: string;
  run_id: string;
  orgao_id: string;
  unidade_id: string | null;
  agent_id: string;
  network_id: string;
  target: string;
  state: string;
  created: number;
  started: number | null;
  finished: number | null;
  total: number;
  processed: number;
  found: number;
  errors: number;
  attempts: number;
  requested_by: string;
};
export type DiscoveryEvidence = {
  method: string;
  field: string;
  value: string;
  source: "DECLARED" | "INFERRED";
};
export type DiscoveryPayload = {
  ip: string;
  mac: string | null;
  hostname: string | null;
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
  firmware: string | null;
  device_type: string;
  confidence: "CONFIRMED" | "PROBABLE" | "UNKNOWN";
  protocols: string[];
  open_ports: number[];
  capabilities: string[];
  driver: string | null;
  evidence: DiscoveryEvidence[];
  warnings: string[];
};
export type DiscoveryDevice = {
  id: string;
  device_id: string;
  job_id: string;
  job?: DiscoveryJob;
  orgao_id: string;
  ip: string;
  created: number;
  payload: DiscoveryPayload;
  registration?: {
    state: "NEW" | "REGISTERED" | "CONFLICT";
    equipmentId?: string;
    label?: string;
    warnings: string[];
  };
};
export type DiscoveryDetail = DiscoveryDevice & {
  device: { first_seen: number; last_seen: number };
  job: DiscoveryJob;
  history: DiscoveryDevice[];
};
export type DiscoverySnapshot = {
  agents: DiscoveryAgent[];
  networks: DiscoveryNetwork[];
  jobs: DiscoveryJob[];
  jobsTotal: number;
  units: Array<{ id: string; sigla: string; nome: string }>;
  devices: DiscoveryDevice[];
  devicesTotal: number;
};
export const TERMINAL_DISCOVERY_STATES = new Set([
  "COMPLETED",
  "PARTIAL",
  "CANCELLED",
  "FAILED",
  "TIMED_OUT",
]);
export const DISCOVERY_PROTOCOLS = [
  "GENERIC",
  "CONTROL_ID_FACE_ID",
  "CONTROL_ID_IDCLASS_BIO",
  "HENRY",
  "HENRY_LUMEN_BALCAO",
  "HENRY_REP_WEB_SERVER",
  "DIMEP_SMART_PRINT",
  "INTELBRAS_BIO_T",
] as const;
