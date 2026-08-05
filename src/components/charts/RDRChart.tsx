import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { cn } from '../../lib/cn'

export interface RDRChartProps {
  data: { outcome: string; percentage: number }[]
  className?: string
}

const colors = ['#22C55E', '#EF4444']

export function RDRChart({ data, className }: RDRChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn('h-64 flex items-center justify-center text-muted', className)}>
        No RDR data available
      </div>
    )
  }

  return (
    <div className={cn('h-64', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="percentage"
            nameKey="outcome"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgb(var(--c-surface))',
              border: '1px solid rgb(var(--c-border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'rgb(var(--c-text))' }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}