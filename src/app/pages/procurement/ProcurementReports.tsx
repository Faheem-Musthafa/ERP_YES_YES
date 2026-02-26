import React from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { FileText, Download } from 'lucide-react';

export const ProcurementReports = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Procurement Reports</h1>
        <p className="text-gray-600 mt-1">Generate and download procurement reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Purchase Order Summary</h3>
              <p className="text-sm text-gray-600 mt-1">Overview of all purchase orders by status</p>
              <Button className="mt-4 bg-[#1e3a8a] hover:bg-blue-900">
                <Download size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Supplier Performance Report</h3>
              <p className="text-sm text-gray-600 mt-1">Analyze supplier delivery and quality metrics</p>
              <Button className="mt-4 bg-[#1e3a8a] hover:bg-blue-900">
                <Download size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">GRN History Report</h3>
              <p className="text-sm text-gray-600 mt-1">Track all goods received notes</p>
              <Button className="mt-4 bg-[#1e3a8a] hover:bg-blue-900">
                <Download size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Procurement Spend Analysis</h3>
              <p className="text-sm text-gray-600 mt-1">Detailed spending analysis by period</p>
              <Button className="mt-4 bg-[#1e3a8a] hover:bg-blue-900">
                <Download size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Pending Deliveries Report</h3>
              <p className="text-sm text-gray-600 mt-1">Track outstanding purchase orders</p>
              <Button className="mt-4 bg-[#1e3a8a] hover:bg-blue-900">
                <Download size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-teal-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Procurement Report</h3>
              <p className="text-sm text-gray-600 mt-1">Comprehensive monthly procurement overview</p>
              <Button className="mt-4 bg-[#1e3a8a] hover:bg-blue-900">
                <Download size={16} className="mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
