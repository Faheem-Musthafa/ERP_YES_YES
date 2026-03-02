import React from 'react';
import { Button } from '@/app/components/ui/button';
import { FileText, Download } from 'lucide-react';

export const ProcurementReports = () => {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Procurement Reports</h1>
        <p className="text-gray-500 mt-1 text-sm">Generate and download procurement reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Purchase Order Summary', desc: 'Overview of all purchase orders by status', iconBg: 'bg-teal-100', iconClr: 'text-teal-600' },
          { title: 'Supplier Performance Report', desc: 'Analyze supplier delivery and quality metrics', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600' },
          { title: 'GRN History Report', desc: 'Track all goods received notes', iconBg: 'bg-purple-100', iconClr: 'text-purple-600' },
          { title: 'Procurement Spend Analysis', desc: 'Detailed spending analysis by period', iconBg: 'bg-blue-100', iconClr: 'text-blue-600' },
          { title: 'Pending Deliveries Report', desc: 'Track outstanding purchase orders', iconBg: 'bg-red-100', iconClr: 'text-red-600' },
          { title: 'Monthly Procurement Report', desc: 'Comprehensive monthly procurement overview', iconBg: 'bg-amber-100', iconClr: 'text-amber-600' },
        ].map((r, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className={`w-10 h-10 ${r.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <FileText size={20} className={r.iconClr} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900">{r.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              <Button className="mt-3 bg-[#34b0a7] hover:bg-[#2a9d94] rounded-xl h-8 text-xs px-3">
                <Download size={14} className="mr-1.5" />
                Generate Report
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
