"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  ListTodo, 
  FileBarChart,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function ManagerMealRequests() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {[
        { 
          title: 'Analytics Dashboard', 
          desc: 'View prediction % and booking turnout.', 
          href: '/meal-requests/dashboard',
          icon: LayoutDashboard,
          color: 'bg-blue-600'
        },
        { 
          title: 'Detailed Booking Log', 
          desc: 'Audit individual user meal requests.', 
          href: '/meal-requests/log',
          icon: ListTodo,
          color: 'bg-gray-900'
        },
        { 
          title: 'Export & Reports', 
          desc: 'Generate kitchen-ready PDF summaries.', 
          href: '/meal-requests/reports',
          icon: FileBarChart,
          color: 'bg-indigo-600'
        }
      ].map((card) => (
        <Card key={card.title} className="rounded-[2.5rem] border-none shadow-xl shadow-blue-500/5 overflow-hidden group">
          <div className="p-10 flex flex-col h-full">
            <div className={`w-14 h-14 ${card.color} text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
               <card.icon size={28} />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-2">{card.title}</h3>
            <p className="text-gray-500 font-medium mb-8 flex-1">{card.desc}</p>
            <Link href={card.href} className="mt-auto">
              <Button className="w-full h-14 rounded-2xl bg-gray-50 text-gray-900 hover:bg-gray-100 font-black uppercase tracking-widest text-xs border border-gray-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                Access Module
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}
