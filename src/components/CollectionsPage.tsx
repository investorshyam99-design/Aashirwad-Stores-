import React from 'react';
import { useUIStore } from '../store/ui';

const CATEGORIES = [
  { id: '1', name: 'Shampoo', icon: '🧴', color: 'bg-blue-50' },
  { id: '2', name: 'Snacks', icon: '🍿', color: 'bg-orange-50' },
  { id: '3', name: 'Cold Drinks', icon: '🥤', color: 'bg-red-50' },
  { id: '4', name: 'Biscuits', icon: '🍪', color: 'bg-yellow-50' },
  { id: '5', name: 'Soap', icon: '🧼', color: 'bg-green-50' },
  { id: '6', name: 'Grocery', icon: '🌾', color: 'bg-amber-50' },
  { id: '7', name: 'Daily Essentials', icon: '🛒', color: 'bg-purple-50' },
];

export function CollectionsPage() {
  const { setActiveTab } = useUIStore();
  
  return (
    <div className="flex flex-col p-4 md:p-10 pb-20">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Collections</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {CATEGORIES.map(category => (
          <div 
            key={category.id}
            onClick={() => {
              useUIStore.getState().setActiveCategoryId(category.id);
              setActiveTab('home');
            }}
            className={`${category.color} rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow border border-gray-100`}
          >
            <span className="text-4xl mb-3">{category.icon}</span>
            <span className="font-semibold text-gray-800">{category.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
