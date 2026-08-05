import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { cn } from '../../lib/cn'

export interface ASRChartProps {
  data: { level: string; percentage: number }[]
  className?: string
}

const colors = ['#22C55E', '#F5A524', '#EF4444']

export function ASRChart({ data, className }: ASRChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn('h-64 flex items-center justify-center text-muted', className)}>
        No ASR data available
      </div>
    )
  }

  return (
    <div className={cn('h-64', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-border))" />
          <XAxis dataKey="level" stroke="rgb(var(--c-muted))" fontSize={12} />
          <YAxis stroke="rgb(var(--c-muted))" fontSize={12} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgb(var(--c-surface))',
              border: '1px solid rgb(var(--c-border))',
              borderRadius: '8px',
            }}
            labelStyle={{ color: 'rgb(var(--c-text))' }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'ASR']}
          />
          <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}