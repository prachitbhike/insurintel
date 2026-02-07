"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Sector } from "@/types/database";
import { type SectorDashboardData } from "@/lib/queries/sector-dashboard";
import { SECTOR_DASHBOARD_CONFIG } from "@/lib/data/sector-dashboard-config";
import { MetricTrendsChart } from "./metric-trends-chart";
import { SectorTargetTable } from "./sector-target-table";
import { UWCostBreakdownChart } from "./uw-cost-breakdown-chart";
import { MLRBreakdownChart } from "./mlr-breakdown-chart";
import { CapitalEfficiencyChart } from "./capital-efficiency-chart";
import { EarningsPowerChart } from "./earnings-power-chart";
import { RevenueEfficiencyChart } from "./revenue-efficiency-chart";

interface SectorMarketPulseDashboardProps {
  sectorName: Sector;
  sectorLabel: string;
  dashboardData: SectorDashboardData;
}

function Tab1Content({
  sectorName,
  dashboardData,
}: {
  sectorName: Sector;
  dashboardData: SectorDashboardData;
}) {
  const { carriers, years } = dashboardData;

  switch (sectorName) {
    case "P&C":
      return (
        <UWCostBreakdownChart
          carriers={carriers}
          sectorLabel="P&C carriers"
          excludeTickers={["ERIE"]}
        />
      );
    case "Reinsurance":
      return (
        <UWCostBreakdownChart
          carriers={carriers}
          sectorLabel="Reinsurers"
        />
      );
    case "Mortgage Insurance":
      return (
        <UWCostBreakdownChart
          carriers={carriers}
          sectorLabel="MI companies"
          allowNegativeLoss
        />
      );
    case "Health":
      return (
        <MLRBreakdownChart
          carriers={carriers}
          years={years}
        />
      );
    case "Life":
      return (
        <CapitalEfficiencyChart
          carriers={carriers}
          years={years}
        />
      );
    case "Brokers":
      return (
        <EarningsPowerChart
          carriers={carriers}
          years={years}
        />
      );
    case "Title":
      return (
        <RevenueEfficiencyChart
          carriers={carriers}
          years={years}
        />
      );
    default:
      return null;
  }
}

export function SectorMarketPulseDashboard({
  sectorName,
  sectorLabel,
  dashboardData,
}: SectorMarketPulseDashboardProps) {
  const config = SECTOR_DASHBOARD_CONFIG[sectorName];
  const { carriers, years, sectorMedians } = dashboardData;

  const Tab1Icon = config.tab1.icon;
  const Tab2Icon = config.tab2.icon;
  const Tab3Icon = config.tab3.icon;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tab1" className="w-full">
        <TabsList variant="line" className="w-full justify-start border-b border-border/50 h-auto p-0">
          <TabsTrigger
            value="tab1"
            className="px-4 py-2.5 text-sm gap-1.5"
          >
            <Tab1Icon className="h-3.5 w-3.5" />
            {config.tab1.name}
          </TabsTrigger>
          <TabsTrigger
            value="tab2"
            className="px-4 py-2.5 text-sm gap-1.5"
          >
            <Tab2Icon className="h-3.5 w-3.5" />
            {config.tab2.name}
          </TabsTrigger>
          <TabsTrigger
            value="tab3"
            className="px-4 py-2.5 text-sm gap-1.5"
          >
            <Tab3Icon className="h-3.5 w-3.5" />
            {config.tab3.name}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tab1" className="mt-6">
          <Tab1Content
            sectorName={sectorName}
            dashboardData={dashboardData}
          />
        </TabsContent>

        <TabsContent value="tab2" className="mt-6">
          <MetricTrendsChart
            carriers={carriers}
            years={years}
            primaryMetric={config.tab2.primaryMetric}
            primaryLabel={config.tab2.primaryLabel}
            secondaryMetric={config.tab2.secondaryMetric}
            secondaryLabel={config.tab2.secondaryLabel}
            higherIsWorse={config.tab2.higherIsWorse}
            excludeTickers={sectorName === "P&C" ? ["ERIE"] : []}
          />
        </TabsContent>

        <TabsContent value="tab3" className="mt-6">
          <SectorTargetTable
            carriers={carriers}
            years={years}
            columns={config.tab3.columns}
            sectorMedians={sectorMedians}
            sectorLabel={sectorLabel}
            csvFilename={config.tab3.csvFilename}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
