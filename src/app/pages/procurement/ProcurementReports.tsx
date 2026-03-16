import React from 'react';
import { Button } from '@/app/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { PageHeader, DataCard } from '@/app/components/ui/primitives';

export const ProcurementReports = () => {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Procurement Reports"
        subtitle="Generate and download procurement reports"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Purchase Order Summary', desc: 'Overview of all purchase orders by status', iconBg: 'bg-teal-100', iconClr: 'text-teal-600' },
          { title: 'Supplier Performance Report', desc: 'Analyze supplier delivery and quality metrics', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600' },
          { title: 'GRN History Report', desc: 'Track all goods received notes', iconBg: 'bg-purple-100', iconClr: 'text-purple-600' },
          { title: 'Procurement Spend Analysis', desc: 'Detailed spending analysis by period', iconBg: 'bg-blue-100', iconClr: 'text-blue-600' },
          { title: 'Pending Deliveries Report', desc: 'Track outstanding purchase orders', iconBg: 'bg-red-100', iconClr: 'text-red-600' },
          { title: 'Monthly Procurement Report', desc: 'Comprehensive monthly procurement overview', iconBg: 'bg-amber-100', iconClr: 'text-amber-600' },
        ].map((r, i) => (
          <DataCard key={i} className="p-5 flex items-start gap-4">
            <div className={`w-10 h-10 ${r.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <FileText size={20} className={r.iconClr} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground">{r.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              <Button size="sm" className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs px-3">
                <Download size={14} className="mr-1.5" />
                Generate Report
              </Button>
            </div>
          </DataCard>
        ))}
      </div>
    </div>
  );
};
