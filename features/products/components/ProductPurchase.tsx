'use client';
import { useState } from 'react';
import MobileNavigation from '@/components/layout/MobileNavigation';
import { AddToCartButton } from '@/features/cart';
import type { Products } from '../types/product.types';
import { money } from '@/features/cart/display';
export function ProductPurchase({ product, variations }: { product: Products; variations: Products[] }) {
  const attributes = product.attributes.filter(attribute => attribute.has_variations);
  const [selection, setSelection] = useState<Record<string, string>>(() => Object.fromEntries(attributes.map(attribute => [attribute.name, attribute.terms.find(term => term.default)?.slug || ''])));
  const variable = product.type === 'variable';
  const match = variable && attributes.every(attribute => selection[attribute.name]) ? product.variations?.find(variation => variation.attributes.every(attribute => !attribute.value || attribute.value === selection[attribute.name])) : undefined;
  const selected = variable ? variations.find(variation => variation.id === match?.id) : product;
  const available = !!selected && selected.is_in_stock && selected.is_purchasable !== false && (selected.type === undefined || ['simple', 'variation'].includes(selected.type));
  const item = { id: selected?.id || product.id, quantity: selected?.add_to_cart?.minimum || 1, ...(variable ? { variation: attributes.map(attribute => ({ attribute: attribute.taxonomy || attribute.name, value: selection[attribute.name] || '' })) } : {}) };
  return <div className="my-6 space-y-4">
    {attributes.map(attribute => <label key={attribute.id || attribute.name} className="block space-y-2 text-sm"><span>{attribute.name}</span>
      <select aria-label={'انتخاب ' + attribute.name} value={selection[attribute.name] || ''} onChange={event => setSelection(current => ({ ...current, [attribute.name]: event.target.value }))} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 outline-orange-500">
        <option value="">انتخاب کنید</option>{attribute.terms.map(term => <option key={term.slug} value={term.slug}>{term.name}</option>)}
      </select>
    </label>)}
    <p data-testid="purchase-price" className="text-left text-lg font-bold">{money((selected || product).prices.price, (selected || product).prices)}</p>
    {!available && <p className="text-sm leading-6 text-gray-500">{variable && !selected ? 'لطفاً تنوع محصول را انتخاب کنید.' : 'این محصول در حال حاضر قابل خرید نیست.'}</p>}
    <AddToCartButton item={item} disabled={!available} />
    <MobileNavigation cart={<AddToCartButton item={item} disabled={!available} />} />
  </div>;
}

