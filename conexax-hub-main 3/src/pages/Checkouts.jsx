import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CheckoutProviderCard from "../components/sales/CheckoutProviderCard";

const providers = [
  {
    id: "yampi",
    name: "Yampi",
    description: "Plataforma completa de e-commerce",
    logo: "🛒"
  },
  {
    id: "shopify",
    name: "Shopify",
    description: "Líder global em e-commerce",
    logo: "🛍️"
  },
  {
    id: "kiwify",
    name: "Kiwify",
    description: "Checkout para produtos digitais",
    logo: "🥝"
  }
];

export default function Checkouts() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Checkouts</h1>
          <p className="text-slate-600 mt-1">Configure os provedores de checkout</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <CheckoutProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      </div>
    </div>
  );
}