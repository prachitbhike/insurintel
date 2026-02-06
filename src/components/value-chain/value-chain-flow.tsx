"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlowNode } from "./flow-node";
import { FlowEdge } from "./flow-edge";
import { type ValueChainData } from "@/lib/queries/value-chain";
import { useRouter } from "next/navigation";

interface ValueChainFlowProps {
  data: ValueChainData;
}

export function ValueChainFlow({ data }: ValueChainFlowProps) {
  const router = useRouter();

  // Layout constants
  const svgWidth = 900;
  const svgHeight = 460;
  const nodeW = 150;
  const nodeH = 70;

  // Node positions (left-to-right flow)
  const nodes = {
    policyholder: { x: 20, y: 60, label: "Policyholders", amount: data.totalPremiums, desc: "Premiums paid", color: "hsl(217 91% 60%)" },
    broker: { x: 220, y: 20, label: "Brokers", amount: data.brokerRevenue, desc: "Distribution revenue", color: "hsl(347 77% 50%)" },
    pc: { x: 420, y: 0, label: "P&C Carriers", amount: data.bySector["P&C"]?.premiums ?? 0, desc: "Net premiums", color: "hsl(217 91% 60%)" },
    life: { x: 420, y: 90, label: "Life Insurers", amount: data.bySector["Life"]?.premiums ?? 0, desc: "Net premiums", color: "hsl(160 84% 39%)" },
    health: { x: 420, y: 180, label: "Health Payers", amount: data.bySector["Health"]?.premiums ?? 0, desc: "Revenue", color: "hsl(263 70% 50%)" },
    reinsurance: { x: 700, y: 0, label: "Reinsurers", amount: data.reinsurancePremiums, desc: "Reinsurance premiums", color: "hsl(38 92% 50%)" },
    claims: { x: 420, y: 300, label: "Claims & Losses", amount: data.totalClaims, desc: "Total claims paid", color: "hsl(0 84% 60%)" },
    expenses: { x: 620, y: 300, label: "Expenses", amount: data.totalExpenses, desc: "Operating expenses", color: "hsl(0 0% 50%)" },
    investment: { x: 700, y: 120, label: "Investments", amount: data.totalInvestmentIncome, desc: "Investment income", color: "hsl(160 84% 39%)" },
    netIncome: { x: 700, y: 240, label: "Net Income", amount: data.totalNetIncome, desc: "Industry total", color: "hsl(160 84% 39%)" },
  };

  const sectorSlugs: Record<string, string> = {
    "P&C": "p-and-c",
    "Life": "life",
    "Health": "health",
    "Reinsurance": "reinsurance",
    "Brokers": "brokers",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insurance Value Chain</CardTitle>
        <p className="text-xs text-muted-foreground">
          How premiums flow through the insurance ecosystem. Dollar amounts represent aggregate latest-year data across all tracked companies. Click a node to view that sector.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[700px]"
          style={{ maxHeight: 500 }}
        >
          {/* Edges: Policyholder → Broker */}
          <FlowEdge
            x1={20 + nodeW} y1={60 + nodeH / 2}
            x2={220} y2={20 + nodeH / 2}
            color={nodes.broker.color}
            animated
          />
          {/* Policyholder → P&C */}
          <FlowEdge
            x1={20 + nodeW} y1={60 + nodeH / 2}
            x2={420} y2={0 + nodeH / 2}
            color={nodes.pc.color}
            animated
          />
          {/* Policyholder → Life */}
          <FlowEdge
            x1={20 + nodeW} y1={60 + nodeH / 2}
            x2={420} y2={90 + nodeH / 2}
            color={nodes.life.color}
            animated
          />
          {/* Policyholder → Health */}
          <FlowEdge
            x1={20 + nodeW} y1={60 + nodeH / 2}
            x2={420} y2={180 + nodeH / 2}
            color={nodes.health.color}
            animated
          />
          {/* Broker → Carriers */}
          <FlowEdge
            x1={220 + nodeW} y1={20 + nodeH / 2}
            x2={420} y2={0 + nodeH / 2}
            color={nodes.broker.color}
          />
          {/* P&C → Reinsurance */}
          <FlowEdge
            x1={420 + nodeW} y1={0 + nodeH / 2}
            x2={700} y2={0 + nodeH / 2}
            color={nodes.reinsurance.color}
            animated
          />
          {/* Carriers → Claims */}
          <FlowEdge
            x1={420 + nodeW / 2} y1={0 + nodeH}
            x2={420 + nodeW / 2} y2={300}
            color={nodes.claims.color}
          />
          <FlowEdge
            x1={420 + nodeW / 2} y1={90 + nodeH}
            x2={420 + nodeW / 2} y2={300}
            color={nodes.claims.color}
          />
          <FlowEdge
            x1={420 + nodeW / 2} y1={180 + nodeH}
            x2={420 + nodeW / 2} y2={300}
            color={nodes.claims.color}
          />
          {/* Carriers → Expenses */}
          <FlowEdge
            x1={420 + nodeW} y1={180 + nodeH / 2}
            x2={620} y2={300 + nodeH / 2}
            color={nodes.expenses.color}
          />
          {/* Carriers → Investment Income */}
          <FlowEdge
            x1={420 + nodeW} y1={90 + nodeH / 2}
            x2={700} y2={120 + nodeH / 2}
            color={nodes.investment.color}
          />
          {/* Investment → Net Income */}
          <FlowEdge
            x1={700 + nodeW / 2} y1={120 + nodeH}
            x2={700 + nodeW / 2} y2={240}
            color={nodes.netIncome.color}
          />

          {/* Render Nodes */}
          <FlowNode {...nodes.policyholder} width={nodeW} height={nodeH} />
          <FlowNode {...nodes.broker} width={nodeW} height={nodeH}
            onClick={() => router.push(`/sectors/${sectorSlugs["Brokers"]}`)} />
          <FlowNode {...nodes.pc} width={nodeW} height={nodeH}
            onClick={() => router.push(`/sectors/${sectorSlugs["P&C"]}`)} />
          <FlowNode {...nodes.life} width={nodeW} height={nodeH}
            onClick={() => router.push(`/sectors/${sectorSlugs["Life"]}`)} />
          <FlowNode {...nodes.health} width={nodeW} height={nodeH}
            onClick={() => router.push(`/sectors/${sectorSlugs["Health"]}`)} />
          <FlowNode {...nodes.reinsurance} width={nodeW} height={nodeH}
            onClick={() => router.push(`/sectors/${sectorSlugs["Reinsurance"]}`)} />
          <FlowNode {...nodes.claims} width={nodeW} height={nodeH} />
          <FlowNode {...nodes.expenses} width={nodeW} height={nodeH} />
          <FlowNode {...nodes.investment} width={nodeW} height={nodeH} />
          <FlowNode {...nodes.netIncome} width={nodeW} height={nodeH} />
        </svg>
      </CardContent>
    </Card>
  );
}
