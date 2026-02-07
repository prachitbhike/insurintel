"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Users } from "lucide-react";
import { CostBreakdownChart } from "./cost-breakdown-chart";
import { ExpenseTrendsChart } from "./expense-trends-chart";
import { BuyerLandscapeTable } from "./buyer-landscape-table";
import { type PCDashboardData } from "@/lib/queries/pc-dashboard";

interface PCMarketPulseDashboardProps {
  dashboardData: PCDashboardData;
}

export function PCMarketPulseDashboard({
  dashboardData,
}: PCMarketPulseDashboardProps) {
  const { carriers, sectorMedianCombined, sectorMedianExpenseRatio, years } =
    dashboardData;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="cost-breakdown" className="w-full">
        <TabsList variant="line" className="w-full justify-start border-b border-border/50 h-auto p-0">
          <TabsTrigger
            value="cost-breakdown"
            className="px-4 py-2.5 text-sm gap-1.5"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Cost Breakdown
          </TabsTrigger>
          <TabsTrigger
            value="expense-trends"
            className="px-4 py-2.5 text-sm gap-1.5"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Expense Trends
          </TabsTrigger>
          <TabsTrigger
            value="target-list"
            className="px-4 py-2.5 text-sm gap-1.5"
          >
            <Users className="h-3.5 w-3.5" />
            Target List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cost-breakdown" className="mt-6">
          <CostBreakdownChart
            carriers={carriers}
            years={years}
          />
        </TabsContent>

        <TabsContent value="expense-trends" className="mt-6">
          <ExpenseTrendsChart
            carriers={carriers}
            years={years}
            sectorMedianExpenseRatio={sectorMedianExpenseRatio}
          />
        </TabsContent>

        <TabsContent value="target-list" className="mt-6">
          <BuyerLandscapeTable
            carriers={carriers}
            sectorMedianCombined={sectorMedianCombined}
            years={years}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
