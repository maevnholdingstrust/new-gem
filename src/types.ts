export interface PnL {
  gross: number;
  fees: number;
  gas: number;
  net: number;
}

export interface NetworkStatus {
  gas: number;
  block: number;
  mempool: number;
}

export interface PoolTVL {
  dex: string;
  pool: string;
  tvl: number;
}

export interface SellLegOption {
  venue: string;
  return_usd_value: number;
  price_per_token: number;
}

export interface MathModel {
  flashloan_usd: number;
  min_flashloan_usd: number;
  max_flashloan_usd: number;
  pools: PoolTVL[];
  buy_leg1_venue: string;
  buy_leg1_received_token_a: number;
  buy_leg1_executable_usd_price: number;
  sell_leg2_options: SellLegOption[];
  sell_leg2_chosen_venue: string;
  sell_leg2_executable_usd_value: number;
  sell_leg2_executable_usd_price: number;
  spread_usd_per_token: number;
  gross_profit_usd: number;

  // Final Execution Math Cost Matrix
  flashloan_fee_usd: number;
  dex_fees_usd: number;
  gas_usd: number;
  builder_cost_usd: number;
  ev_buffer_usd: number;
  net_profit_usd: number;
  min_profit_threshold: number;
  is_profitable: boolean;
}

export interface SSOTData {
  i1: string; // Inventory handoff delta (USD)
  i2: string; // Gross identity delta (USD)
  i3: string; // Net identity delta (USD)
  i4: string; // Fee validity status
}

export interface C2Data {
  p_fill: string;
  ev: string;
  decision: "STRIKE" | "NO-OP";
  reason: string;
}

export interface ExecutionData {
  hash: string;
  gas_used: string;
  actual_output_usd: string;
  actual_profit_usd: string;
}

export interface Opportunity {
  opportunity_id: string;
  cycle_id: string;
  route_id: string;
  token_pair: string;
  block_number: number;
  p_net_det: string;
  ev: string;
  spread_bps: string;
  audit_status: "PENDING" | "AUDITED" | "FAILED" | "SUCCESS";
  timestamp: string;
  math: MathModel;
  ssot: SSOTData;
  c2: C2Data;
  execution: ExecutionData;
  state: {
    pre: string;
    post: string;
  };
}

export interface LiquidationEvent {
  id: string;
  vault: string;
  debt: string;
  collateral: string;
  discount: string;
  health_factor: number;
  status: "DETECTED" | "EXECUTING" | "EXECUTED" | "FAILED";
  txHash?: string;
}

export interface EngineState {
  pnl: PnL;
  network: NetworkStatus;
  liquidations: LiquidationEvent[];
}
