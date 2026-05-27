import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { DataCard } from '@/app/components/ui/primitives';

interface LocationDatum { name: string; customers: number; revenue: number }

const COLORS = ['#00bdb4', '#ff6b6b', '#4ecdc4', '#ffe66d'];

interface Props { locationData: LocationDatum[] }

const MyCustomersCharts = ({ locationData }: Props) => {
  const customersChartData = locationData.filter(l => l.customers > 0);
  const revenueChartData = locationData.filter(l => l.revenue > 0);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <DataCard className="p-4">
        <h3 className="text-sm font-semibold mb-4">Customers by Location</h3>
        {customersChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={customersChartData} dataKey="customers" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {customersChartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : <p className="text-muted-foreground text-sm">No location data</p>}
      </DataCard>
      <DataCard className="p-4">
        <h3 className="text-sm font-semibold mb-4">Revenue by Location</h3>
        {revenueChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#00bdb4" />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-muted-foreground text-sm">No revenue data</p>}
      </DataCard>
    </div>
  );
};

export default MyCustomersCharts;
