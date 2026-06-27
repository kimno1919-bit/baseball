"use client";

import React from "react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { formatRate } from "@/lib/stats";

export default function StatsChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="gameDate" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          domain={[0, 1]} 
          fontSize={10} 
          tickLine={false} 
          axisLine={false} 
        />
        <Tooltip formatter={(value: any) => formatRate(value)} />
        <Line 
          type="monotone" 
          dataKey="currentAvg" 
          name="누적 타율" 
          stroke="#1E3A5F" 
          strokeWidth={3} 
          dot={{ r: 4 }} 
          activeDot={{ r: 6 }} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
