import { useState, useEffect } from 'react';
import { Check, Zap, Star } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function PlansPage({ api }) {
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState('monthly'); // monthly | yearly

  useEffect(() => {
    fetch(`${API_URL}/v1/factory/plans`)
      .then(r => r.json())
      .then(d => setPlans(d.plans || []))
      .catch(console.error);
  }, []);

  const price = (plan) => billing === 'yearly'
    ? plan.yearlyPrice
    : plan.monthlyPrice;

  const savings = (plan) => Math.round(((plan.monthlyPrice * 12) - plan.yearlyPrice) / (plan.monthlyPrice * 12) * 100);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">Simple, Transparent Pricing</h1>
        <p className="text-slate-500 text-lg">Everything your business needs to grow. No setup fees, no contracts.</p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billing === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billing === 'yearly' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Yearly <span className="text-emerald-500 font-semibold">Save ~17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col ${
              plan.popular
                ? 'border-indigo-600 shadow-xl shadow-indigo-100'
                : 'border-slate-200'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> Most Popular
                </span>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
              <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-slate-900">${price(plan)}</span>
                <span className="text-slate-500 mb-1">/{billing === 'yearly' ? 'yr' : 'mo'}</span>
              </div>
              {billing === 'yearly' && (
                <p className="text-xs text-emerald-600 mt-1">Save {savings(plan)}% vs monthly</p>
              )}
            </div>

            <ul className="space-y-3 flex-1 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>

            <a
              href="/customers/new"
              className={`w-full py-3 rounded-xl text-center text-sm font-semibold transition-colors ${
                plan.popular
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              Get Started
            </a>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-slate-500 text-sm">
          Need something custom? <a href="mailto:hello@twomiah.com" className="text-indigo-600 font-medium hover:underline">Contact us</a> for enterprise pricing.
        </p>
        <div className="flex items-center justify-center gap-8 mt-6 text-sm text-slate-400">
          <span className="flex items-center gap-1"><Zap className="w-4 h-4" /> No setup fees</span>
          <span className="flex items-center gap-1"><Zap className="w-4 h-4" /> Cancel anytime</span>
          <span className="flex items-center gap-1"><Zap className="w-4 h-4" /> Free onboarding</span>
        </div>
      </div>
    </div>
  );
}
