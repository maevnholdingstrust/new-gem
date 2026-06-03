import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Historic audits database for Replay Mode
const HISTORICAL_OPPORTUNITIES = [
  {
    opportunity_id: "HIST-001",
    cycle_id: "CYC-942001",
    route_id: "RTE-UNISWAP-DEPEG",
    token_pair: "WETH / USDC",
    block_number: 19482103,
    spread_bps: "42.50",
    p_net_det: "1850.50",
    ev: "1810.00",
    audit_status: "SUCCESS" as const,
    timestamp: "2026-06-03T10:14:00.000Z",
    math: {
      flashloan_usd: 120000,
      min_flashloan_usd: 1000,
      max_flashloan_usd: 150000,
      pools: [
        { dex: "Uniswap V3", pool: "0x8ad5...f6e0", tvl: 1000000 },
        { dex: "QuickSwap", pool: "0x397...a17b", tvl: 1500000 },
      ],
      buy_leg1_venue: "Uniswap V3",
      buy_leg1_received_token_a: 121500,
      buy_leg1_executable_usd_price: 0.987654,
      sell_leg2_options: [
        { venue: "SushiSwap", return_usd_value: 122100, price_per_token: 1.004938 },
        { venue: "QuickSwap", return_usd_value: 123850, price_per_token: 1.019341 },
        { venue: "Balancer", return_usd_value: 121900, price_per_token: 1.003292 },
      ],
      sell_leg2_chosen_venue: "QuickSwap",
      sell_leg2_executable_usd_value: 123850,
      sell_leg2_executable_usd_price: 1.019341,
      spread_usd_per_token: 0.031687,
      gross_profit_usd: 3850,
      flashloan_fee_usd: 60,
      dex_fees_usd: 360,
      gas_usd: 120,
      builder_cost_usd: 40,
      ev_buffer_usd: 200,
      net_profit_usd: 3070,
      min_profit_threshold: 50,
      is_profitable: true,
    },
    ssot: {
      i1: "0.00",
      i2: "0.01",
      i3: "0.00",
      i4: "VALID",
    },
    c2: {
      p_fill: "0.98",
      ev: "3008.60 USD",
      decision: "STRIKE" as const,
      reason: "Spread exceeds gas & builder buffer bounds cleanly.",
    },
    execution: {
      hash: "0x7a29e1f582cc762ab850fe6a9b4fe22f9876543210190bd8472910fa321eb9ff",
      gas_used: "142,500",
      actual_output_usd: "123,850.00",
      actual_profit_usd: "3,070.00",
    },
    state: {
      pre: "hash_pre_94210a",
      post: "hash_post_94210b",
    },
  },
  {
    opportunity_id: "HIST-002",
    cycle_id: "CYC-942002",
    route_id: "RTE-CURVE-SWEEP",
    token_pair: "WBTC / USDT",
    block_number: 19482500,
    spread_bps: "12.80",
    p_net_det: "-120.40",
    ev: "-180.00",
    audit_status: "FAILED" as const,
    timestamp: "2026-06-03T11:22:30.000Z",
    math: {
      flashloan_usd: 80000,
      min_flashloan_usd: 1000,
      max_flashloan_usd: 45000,
      pools: [
        { dex: "Curve", pool: "0x1111...aaaa", tvl: 300000 },
        { dex: "SushiSwap", pool: "0x2222...bbbb", tvl: 800000 },
      ],
      buy_leg1_venue: "Curve",
      buy_leg1_received_token_a: 80550,
      buy_leg1_executable_usd_price: 0.993172,
      sell_leg2_options: [
        { venue: "SushiSwap", return_usd_value: 80800, price_per_token: 1.003103 },
        { venue: "QuickSwap", return_usd_value: 80300, price_per_token: 0.996896 },
      ],
      sell_leg2_chosen_venue: "SushiSwap",
      sell_leg2_executable_usd_value: 80800,
      sell_leg2_executable_usd_price: 1.003103,
      spread_usd_per_token: 0.009931,
      gross_profit_usd: 800,
      flashloan_fee_usd: 40,
      dex_fees_usd: 240,
      gas_usd: 450, // High gas spike!
      builder_cost_usd: 100,
      ev_buffer_usd: 90,
      net_profit_usd: -120, // Failed decision threshold!
      min_profit_threshold: 50,
      is_profitable: false,
    },
    ssot: {
      i1: "0.00",
      i2: "0.15",
      i3: "-0.20",
      i4: "VALID",
    },
    c2: {
      p_fill: "0.20",
      ev: "-180.00 USD",
      decision: "NO-OP" as const,
      reason: "Gas pressure ($450) and low volume exceeds executable gross spread.",
    },
    execution: {
      hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      gas_used: "0",
      actual_output_usd: "0.00",
      actual_profit_usd: "0.00",
    },
    state: {
      pre: "hash_pre_883a",
      post: "hash_pre_883a",
    },
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mutable dynamic configurations (for fine tuning our active monitoring & liquidation configurations)
  let liquidationConfig = {
    minDiscountThreshold: 10,
    maxGasLimitGwei: 40,
    minHealthFactorTrigger: 0.95,
    enabledProtocols: {
      MakerDAO: true,
      AaveV3: true,
      CompoundV3: true,
      Liquity: true
    }
  };

  // Mutable Engine State with default USD values
  let engineState = {
    pnl: {
      gross: 2450.80,
      fees: 480.20,
      gas: 310.40,
      net: 1660.20,
    },
    activeLanes: Array.from({ length: 32 }, (_, i) => ({
      id: i,
      status: "IDLE",
      currentJob: null,
    })),
    network: {
      gas: 28,
      block: 19504021,
      mempool: 415,
    },
    liquidations: [
      {
        id: "LIQ-MKR-01",
        vault: "MakerDAO ETH-A (0x8bb1...77d8)",
        debt: "45,000.00 DAI",
        collateral: "28.50 ETH",
        discount: "13.2%",
        health_factor: 0.91,
        status: "EXECUTED" as const
      },
      {
        id: "LIQ-AAV-02",
        vault: "Aave V3 WBTC (0x5fd1...921c)",
        debt: "82,400.00 USDC",
        collateral: "1.25 WBTC",
        discount: "8.5%",
        health_factor: 0.94,
        status: "DETECTED" as const
      }
    ],
  };

  // Cache array to keep track of real live Polygon token pair conditions fetched from DexScreener
  let livePairsCache: any[] = [];
  let isLiveFeedActive = false;

  const fetchLiveMarketData = async () => {
    try {
      console.log("[DEXScreener API] Fetching live Polygon token pools...");
      // Query DexScreener for WETH, WBTC, POL/WMATIC and LINK tokens
      const response = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619,0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6,0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270,0x53E0bca359352f1275b1b2519477603CC4a1a890"
      );
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const json: any = await response.json();
      if (json && json.pairs && Array.isArray(json.pairs)) {
        // Filter exclusively for Polygon Chain pools
        const polygonPairs = json.pairs.filter((p: any) => p.chainId === "polygon");
        if (polygonPairs.length > 0) {
          livePairsCache = polygonPairs;
          isLiveFeedActive = true;
          console.log(`[DEXScreener API] Successfully synchronized ${polygonPairs.length} live Polygon liquidity pools.`);
          // Broadcast ticker updates so the frontend can display real-time price feeds
          broadcast("dex_feed.synchronized", {
            isLive: true,
            poolsCount: polygonPairs.length,
            timestamp: Date.now(),
            tokens: ["WETH", "WBTC", "POL", "LINK"].map(sym => {
              const symPair = polygonPairs.find((p: any) => p.baseToken?.symbol === sym || p.quoteToken?.symbol === sym);
              return {
                symbol: sym,
                priceUsd: symPair ? parseFloat(symPair.priceUsd) : (sym === "WETH" ? 3420 : sym === "WBTC" ? 67800 : sym === "POL" ? 0.45 : 14.1),
                volume24h: symPair?.volume?.h24 || 0,
                liquidityUsd: symPair?.liquidity?.usd || 0,
                dex: symPair?.dexId || "uniswap"
              };
            })
          });
        }
      }
    } catch (err: any) {
      console.warn("[DEXScreener API] Synchronization failed, utilizing high-fidelity local failback mechanism.", err.message);
      isLiveFeedActive = false;
    }
  };

  // Run the initializer fetch and schedule periodic updates
  setTimeout(() => {
    fetchLiveMarketData();
  }, 1000);
  setInterval(fetchLiveMarketData, 20000);

  // Opportunity Helper to generate unique real-time opportunities mimicking live math
  const createOpportunity = () => {
    const id = `OPP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const baseAssets = ["WETH", "WBTC", "POL", "LINK"];
    const baseAsset = baseAssets[Math.floor(Math.random() * baseAssets.length)];
    
    // Choose Quote asset
    const quoteAsset = baseAsset === "WETH" ? "USDC" : (baseAsset === "WBTC" ? "USDT" : (baseAsset === "POL" ? "USDC" : "WETH"));
    const pair = `${baseAsset} / ${quoteAsset}`;

    // Get live price and pools from DexScreener cache if active; otherwise fall back to premium defaults
    let basePriceUsd = baseAsset === "WETH" ? 3450 : (baseAsset === "WBTC" ? 68150 : (baseAsset === "POL" ? 0.45 : 14.25));
    let matchedPools: any[] = [];

    if (isLiveFeedActive && livePairsCache.length > 0) {
      const liveTokens = livePairsCache.filter((p: any) => 
        p.baseToken?.symbol === baseAsset || p.quoteToken?.symbol === baseAsset
      );
      if (liveTokens.length > 0) {
        basePriceUsd = parseFloat(liveTokens[0].priceUsd) || basePriceUsd;
        matchedPools = liveTokens.map((p: any) => ({
          dex: p.dexId.charAt(0).toUpperCase() + p.dexId.slice(1),
          pool: p.pairAddress,
          tvl: p.liquidity?.usd || 750000
        }));
      }
    }

    // Default high-fidelity pool structure if DexScreener has no specific pool mappings
    if (matchedPools.length === 0) {
      matchedPools = [
        { dex: "QuickSwap", pool: "0x" + Math.random().toString(16).substring(2, 10) + "...f7ae", tvl: Math.floor(Math.random() * 1200000 + 400000) },
        { dex: "SushiSwap", pool: "0x" + Math.random().toString(16).substring(2, 10) + "...a129", tvl: Math.floor(Math.random() * 800000 + 300000) },
        { dex: "Uniswap V3", pool: "0x" + Math.random().toString(16).substring(2, 10) + "...c151", tvl: Math.floor(Math.random() * 1500000 + 500000) }
      ];
    }

    // If matches, cap to top 3 pools
    const pools = matchedPools.slice(0, 3);
    const minTVL = Math.min(...pools.map(p => p.tvl));
    const maxFlashloan = Math.floor(minTVL * 0.15); // Strict 15% MIN pool constraint rule
    
    // Choose appropriate flashloan size (MIN USD $1,000)
    const proposedSize = Math.random() > 0.5 ? 80000 : 45000;
    const chosenFlashloan = Math.max(1000, Math.min(proposedSize, maxFlashloan));

    // Live buy venue selection
    const buyVenueObj = pools[0];
    const buyVenue = buyVenueObj.dex;
    const buyPoolTVL = buyVenueObj.tvl;

    // Simulate constant product buy slippage:
    // slippageFactor = size / (pool_liquidity / 2 + size)
    const slippage1 = (chosenFlashloan / ((buyPoolTVL / 2) + chosenFlashloan)) * 0.02;
    const exactTokensReceived = (chosenFlashloan / basePriceUsd) * (1 - slippage1);
    const buyLegPrice = chosenFlashloan / exactTokensReceived;

    // Simulate Sell Venue Options (Discovered venues & price offsets simulating real-time desynchronization)
    const venues = ["Uniswap V3", "SushiSwap", "QuickSwap", "Balancer", "Algebra", "Curve"];
    const activeSellVenues = Array.from(new Set([...pools.map(p => p.dex), ...venues])).slice(0, 5);

    const sellOptions = activeSellVenues.map((v, idx) => {
      // Find matching real pool TVL or generate standard TVL simulation
      const matchPool = pools.find(p => p.dex === v);
      const sellPoolTVL = matchPool ? matchPool.tvl : (800000 + idx * 150000);

      // Simulate a real-world market desynchronization of -0.05% to +1.95% on some venues
      const spreadOffset = (Math.random() * 0.02) - 0.0005;
      const sellBasePrice = basePriceUsd * (1 + spreadOffset);

      // Sell constant product slippage simulation
      const preSellValueUsd = exactTokensReceived * sellBasePrice;
      const slippage2 = (preSellValueUsd / ((sellPoolTVL / 2) + preSellValueUsd)) * 0.02;
      const returnUsd = preSellValueUsd * (1 - slippage2);

      return {
        venue: v,
        return_usd_value: Math.floor(returnUsd),
        price_per_token: returnUsd / exactTokensReceived
      };
    });

    // Select the best routing alternative (Maximizing USD back conversion)
    const sortedOptions = [...sellOptions].sort((a, b) => b.return_usd_value - a.return_usd_value);
    const bestOption = sortedOptions[0];

    const finalSpreadPrice = bestOption.price_per_token - buyLegPrice;
    const spreadBps = ((finalSpreadPrice / buyLegPrice) * 10000).toFixed(2);
    const grossProfitVal = bestOption.return_usd_value - chosenFlashloan;

    // COST MATRIX: Subtracting all fees exactly in USD values
    const flashloanFee = Math.floor(chosenFlashloan * 0.0005); // Standard 0.05%
    const dexFees = Math.floor((chosenFlashloan * 0.003) + (bestOption.return_usd_value * 0.003)); // 0.3% per swap
    const gasUsd = Math.floor(Math.random() * 65 + 25); // Slipping gas level
    const builderCost = 15;
    const evBuffer = 50;

    const netProfit = grossProfitVal - flashloanFee - dexFees - gasUsd - builderCost - evBuffer;
    const isProfitable = netProfit >= 25; // Profitable threshold filter

    return {
      opportunity_id: id,
      cycle_id: `CYC-${Date.now()}`,
      route_id: `RTE-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      token_pair: pair,
      block_number: engineState.network.block,
      spread_bps: spreadBps,
      p_net_det: netProfit.toFixed(2),
      ev: (netProfit * 0.95).toFixed(2),
      audit_status: "PENDING" as const,
      timestamp: new Date().toISOString(),
      math: {
        flashloan_usd: chosenFlashloan,
        min_flashloan_usd: 1000,
        max_flashloan_usd: maxFlashloan,
        pools,
        buy_leg1_venue: buyVenue,
        buy_leg1_received_token_a: parseFloat(exactTokensReceived.toFixed(4)),
        buy_leg1_executable_usd_price: parseFloat(buyLegPrice.toFixed(6)),
        sell_leg2_options: sellOptions.slice(0, 3),
        sell_leg2_chosen_venue: bestOption.venue,
        sell_leg2_executable_usd_value: bestOption.return_usd_value,
        sell_leg2_executable_usd_price: parseFloat(bestOption.price_per_token.toFixed(6)),
        spread_usd_per_token: parseFloat(finalSpreadPrice.toFixed(6)),
        gross_profit_usd: grossProfitVal,
        flashloan_fee_usd: flashloanFee,
        dex_fees_usd: dexFees,
        gas_usd: gasUsd,
        builder_cost_usd: builderCost,
        ev_buffer_usd: evBuffer,
        net_profit_usd: parseFloat(netProfit.toFixed(2)),
        min_profit_threshold: 25,
        is_profitable: isProfitable
      },
      ssot: {
        i1: "0.00",
        i2: (Math.random() * 0.04).toFixed(3),
        i3: (Math.random() * 0.02).toFixed(3),
        i4: "VALID",
      },
      c2: {
        p_fill: isProfitable ? "0.98" : "0.25",
        ev: (netProfit * 0.95).toFixed(2) + " USD",
        decision: isProfitable ? "STRIKE" as const : "NO-OP" as const,
        reason: isProfitable ? "Autonomous strike triggers - EV exceeds threshold margins." : "Spread yields below positive execution boundaries.",
      },
      execution: {
        hash: "0x" + Math.random().toString(16).substring(2, 66),
        gas_used: (gasUsd * 2400).toLocaleString(),
        actual_output_usd: bestOption.return_usd_value.toLocaleString(),
        actual_profit_usd: netProfit.toFixed(2)
      },
      state: {
        pre: "hash_pre_" + Math.random().toString(16).substring(2, 6),
        post: "hash_post_" + Math.random().toString(16).substring(2, 6)
      }
    };
  };

  const createLiquidationEvent = () => {
    const protocols = ["MakerDAO", "AaveV3", "CompoundV3", "Liquity"];
    const selectedProto = protocols[Math.floor(Math.random() * protocols.length)];
    const id = `LIQ-${selectedProto.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const collaterals = ["ETH", "WBTC", "POL", "LINK"];
    const collateral = collaterals[Math.floor(Math.random() * collaterals.length)];
    const randomHealth = (0.75 + Math.random() * 0.23).toFixed(2);
    const isExecuted = parseFloat(randomHealth) < liquidationConfig.minHealthFactorTrigger;

    return {
      id,
      vault: `${selectedProto} ${collateral}-A (0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)})`,
      debt: (Math.random() * 40000 + 10000).toFixed(2) + " DAI",
      collateral: (Math.random() * 25 + 5).toFixed(2) + " " + collateral,
      discount: "13.2%",
      health_factor: parseFloat(randomHealth),
      status: isExecuted ? ("EXECUTED" as const) : ("DETECTED" as const)
    };
  };

  // WebSocket Server setup
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  const broadcast = (type: string, data: any) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type, data }));
      }
    });
  };

  wss.on("connection", (ws) => {
    console.log("Client connected to Apex-Omega Pipeline WS");
    
    // Sync configurations on connection
    ws.send(JSON.stringify({ type: "SYNC", data: engineState, config: liquidationConfig }));

    ws.on("message", (msg) => {
      try {
        const payload = JSON.parse(msg.toString());
        if (payload.type === "REPLAY") {
          // Send historical forensic audit back immediately
          const index = parseInt(payload.index);
          const opp = HISTORICAL_OPPORTUNITIES[index] || HISTORICAL_OPPORTUNITIES[0];
          ws.send(JSON.stringify({ type: "REPLAY_DATA", data: opp }));
        }
      } catch (e) {
        console.error("WS message error", e);
      }
    });

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "HEARTBEAT", timestamp: Date.now() }));
      }
    }, 5000);

    ws.on("close", () => clearInterval(interval));
  });

  // Sequenced stage list helper to execute each step:
  const runSequencedPipeline = (opp: any) => {
    const id = opp.opportunity_id;
    const isProfitable = opp.math.is_profitable;
    const isStrike = opp.c2.decision === "STRIKE" && isProfitable;

    // Define the sequence of pipeline steps we must execute
    const steps = [
      {
        stage: "DISCOVERED",
        delay: 0,
        details: `WETH/USDC multi-hop pool indices discovered at Block ${opp.block_number}. Initialized spread of ${opp.spread_bps} BPS.`,
        action: () => {
          broadcast("spread.discovered", { id, spread_bps: opp.spread_bps, pair: opp.token_pair });
          broadcast("opportunity.discovered", opp);
        }
      },
      {
        stage: "C1_READY",
        delay: 500,
        details: "C1 Pre-flight static verification analysis inputs initialized.",
        action: () => {
          broadcast("pipeline.state", { id, stage: "C1_READY", details: "C1 Pre-flight checks passed." });
        }
      },
      {
        stage: "C1_SUBMITTED",
        delay: 1000,
        details: "C1 dry-run state contract call check transaction submitted.",
        action: () => {
          broadcast("pipeline.state", { id, stage: "C1_SUBMITTED", details: "C1 read call sent to provider." });
        }
      },
      {
        stage: "C1_LANDED",
        delay: 1500,
        details: "C1 transaction dry-run query execution landed & validated state.",
        action: () => {
          broadcast("c1.evaluated", { id, ...opp.math });
          broadcast("ssot.audit.completed", { id, ...opp.ssot });
          broadcast("pipeline.state", { id, stage: "C1_LANDED", details: "C1 dry-run checks completed." });
        }
      },
      {
        stage: "POST_C1_RECOMPUTE",
        delay: 2000,
        details: "Dynamic slippage constant product mechanics re-evaluated from pre-state values.",
        action: () => {
          broadcast("pipeline.state", { id, stage: "POST_C1_RECOMPUTE", details: "Slippage parameters re-computed." });
        }
      },
      {
        stage: "C2_CANDIDATES_BUILT",
        delay: 2500,
        details: "Multi-legged trade venue routing candidates compiled dynamically.",
        action: () => {
          broadcast("pipeline.state", { id, stage: "C2_CANDIDATES_BUILT", details: "Candidate pool pathways constructed." });
        }
      },
      {
        stage: "C2_DECISION",
        delay: 3000,
        details: isStrike ? "STRIKE triggers autonomously - EV bounds verified." : "NO-OP determined - spread values below target thresholds.",
        action: () => {
          broadcast("c2.decision", { id, decision: opp.c2.decision });
          broadcast("pipeline.state", { id, stage: "C2_DECISION", details: `Decision: ${opp.c2.decision}` });
        }
      }
    ];

    if (isStrike) {
      steps.push(
        {
          stage: "C2_MERKLE_COMMITTED",
          delay: 3500,
          details: "Merkle proof values signed & locked inside current PBS bid container.",
          action: () => {
            broadcast("pipeline.state", { id, stage: "C2_MERKLE_COMMITTED", details: "Merkle commitments broadcast." });
          }
        },
        {
          stage: "C2_SUBMITTED",
          delay: 4000,
          details: "Submitting multi-legged transaction block to private network mempool.",
          action: () => {
            const laneId = Math.floor(Math.random() * 32);
            broadcast("execution.submitted", { id, lane: laneId });
            broadcast("pipeline.state", { id, stage: "C2_SUBMITTED", details: "Submitted for miner block compilation." });
          }
        },
        {
          stage: "C2_LANDED",
          delay: 4800,
          details: `Multi-hop arbitrage cycle confirmed. Block state updated. Net PnL: +$${opp.math.net_profit_usd}`,
          action: () => {
            const profitNum = opp.math.net_profit_usd;
            engineState.pnl.gross += opp.math.gross_profit_usd;
            engineState.pnl.fees += opp.math.flashloan_fee_usd + opp.math.dex_fees_usd;
            engineState.pnl.gas += opp.math.gas_usd;
            engineState.pnl.net += profitNum;
            engineState.network.mempool = Math.max(50, engineState.network.mempool + Math.floor(Math.random() * 60 - 30));
            engineState.network.gas = Math.floor(Math.random() * 15 + 20);
            engineState.network.block++;

            console.log(`[HASH CONFIRMATION RECEIPT] ID: ${id} | Pair: ${opp.token_pair} | Hash: ${opp.execution.hash} | Status: CONFIRMED | Net Profit Logged: +${profitNum.toFixed(2)}`);
            broadcast("execution.confirmed", { id, token_pair: opp.token_pair, ...opp.execution });
            broadcast("pipeline.state", { id, stage: "C2_LANDED", details: "C2 trade successfully mined." });
          }
        },
        {
          stage: "CYCLE_FINALIZED",
          delay: 5300,
          details: "Autonomous cycle finalized on-chain. Engine state storage synced successfully.",
          action: () => {
            broadcast("cycle.completed", { pnl: engineState.pnl, block: engineState.network.block });
            broadcast("pipeline.state", { id, stage: "CYCLE_FINALIZED", details: "Cycle execution lifecycle closed." });
          }
        }
      );
    } else {
      steps.push({
        stage: "CYCLE_FINALIZED",
        delay: 3500,
        details: "Divergent cycle finalized. State de-allocated and resources released.",
        action: () => {
          broadcast("cycle.completed", { pnl: engineState.pnl, block: engineState.network.block });
          broadcast("pipeline.state", { id, stage: "CYCLE_FINALIZED", details: "No-op cycle lifecycle closed." });
        }
      });
    }

    // Run execution sequence
    steps.forEach((step) => {
      setTimeout(() => {
        broadcast("pipeline.transition", {
          id,
          stage: step.stage,
          timestamp: Date.now(),
          details: step.details,
          overall_status: isStrike ? "STRIKE" : "NO-OP"
        });
        step.action();
      }, step.delay);
    });
  };

  // REST endpoints for tuning liquidation settings
  app.post("/api/liquidation/config", (req, res) => {
    liquidationConfig = { ...liquidationConfig, ...req.body };
    broadcast("config.updated", liquidationConfig);
    res.json({ success: true, config: liquidationConfig });
  });

  // REST endpoint for manual trigger or manual opportunity size replay
  app.post("/api/simulation/trigger", (req, res) => {
    const customOpp = createOpportunity();
    // Overrides with custom simulated size if supplied
    if (req.body.size_usd) {
      customOpp.math.flashloan_usd = parseFloat(req.body.size_usd);
      
      const chosenFlashloan = customOpp.math.flashloan_usd;
      const basePriceUsd = customOpp.math.buy_leg1_executable_usd_price || 1.0;
      
      const pools = customOpp.math.pools;
      const buyVenueObj = pools[0];
      const buyPoolTVL = buyVenueObj.tvl;

      const slippage1 = (chosenFlashloan / ((buyPoolTVL / 2) + chosenFlashloan)) * 0.02;
      const exactTokensReceived = (chosenFlashloan / basePriceUsd) * (1 - slippage1);
      const buyLegPrice = chosenFlashloan / exactTokensReceived;

      const adjustedSellOptions = customOpp.math.sell_leg2_options.map((option: any) => {
        const matchPool = pools.find(p => p.dex === option.venue);
        const sellPoolTVL = matchPool ? matchPool.tvl : 800000;
        
        const preSellValueUsd = exactTokensReceived * option.price_per_token;
        const slippage2 = (preSellValueUsd / ((sellPoolTVL / 2) + preSellValueUsd)) * 0.02;
        const returnUsd = preSellValueUsd * (1 - slippage2);

        return {
          venue: option.venue,
          return_usd_value: Math.floor(returnUsd),
          price_per_token: returnUsd / exactTokensReceived
        };
      });

      const sortedAdjusted = [...adjustedSellOptions].sort((a, b) => b.return_usd_value - a.return_usd_value);
      const bestAdjOption = sortedAdjusted[0];

      const grossProfitVal = bestAdjOption.return_usd_value - chosenFlashloan;
      const flashloanFee = Math.floor(chosenFlashloan * 0.0005);
      const dexFees = Math.floor((chosenFlashloan * 0.003) + (bestAdjOption.return_usd_value * 0.003));
      const gasUsd = Math.floor(Math.random() * 65 + 25);
      const builderCost = 15;
      const evBuffer = 50;

      const netProfit = grossProfitVal - flashloanFee - dexFees - gasUsd - builderCost - evBuffer;
      const isProfitable = netProfit >= 25;

      customOpp.math.buy_leg1_received_token_a = parseFloat(exactTokensReceived.toFixed(4));
      customOpp.math.buy_leg1_executable_usd_price = parseFloat(buyLegPrice.toFixed(6));
      customOpp.math.sell_leg2_options = adjustedSellOptions.slice(0, 3);
      customOpp.math.sell_leg2_chosen_venue = bestAdjOption.venue;
      customOpp.math.sell_leg2_executable_usd_value = bestAdjOption.return_usd_value;
      customOpp.math.sell_leg2_executable_usd_price = parseFloat(bestAdjOption.price_per_token.toFixed(6));
      customOpp.math.gross_profit_usd = grossProfitVal;
      customOpp.math.net_profit_usd = parseFloat(netProfit.toFixed(2));
      customOpp.math.is_profitable = isProfitable;

      customOpp.p_net_det = netProfit.toFixed(2);
      customOpp.ev = (netProfit * 0.95).toFixed(2);
      customOpp.c2.decision = isProfitable ? "STRIKE" : "NO-OP";
      customOpp.c2.reason = isProfitable ? "Autonomous strike triggers - EV exceeds threshold margins." : "Spread yields below positive execution boundaries.";
    }

    runSequencedPipeline(customOpp);
    res.json({ success: true, opportunity_id: customOpp.opportunity_id });
  });

  // Simulator Loop for the pipeline sequencer
  const runSimulator = () => {
    const opp = createOpportunity();
    runSequencedPipeline(opp);

    // Simulated Liquidation Engine scanning
    if (Math.random() > 0.65) {
      const liq = createLiquidationEvent();
      engineState.liquidations.unshift(liq);
      engineState.liquidations = engineState.liquidations.slice(0, 15);
      broadcast("liquidation.detected", liq);

      // Trigger automatic liquidation execution sequence if HF < threshold
      if (liq.health_factor < liquidationConfig.minHealthFactorTrigger) {
        setTimeout(() => {
          const found = engineState.liquidations.find(l => l.id === liq.id);
          if (found) {
            (found as any).status = "EXECUTING";
            broadcast("liquidation.updated", found);

            setTimeout(() => {
              (found as any).status = "EXECUTED";
              (found as any).txHash = "0x" + Math.random().toString(16).substring(2, 66);
              broadcast("liquidation.updated", found);
            }, 2500);
          }
        }, 3000);
      }
    }
  };

  // Sequenced loop trigger
  setInterval(runSimulator, 9000);

  // Serve Single-Page React App via Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

startServer();
