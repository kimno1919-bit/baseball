"use client";

import React from "react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from "recharts";

export default function DashboardChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis 
          dataKey="opponent" 
          stroke="#888888" 
          fontSize={11} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="#888888" 
          fontSize={11} 
          tickLine={false} 
          axisLine={false} 
        />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar 
          dataKey="ourScore" 
          name="우리팀 득점" 
          fill="#1E3A5F" 
          radius={[4, 4, 0, 0]} 
        />
        <Bar 
          dataKey="opponentScore" 
          name="상대팀 득점" 
          fill="#EA580C" 
          radius={[4, 4, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
