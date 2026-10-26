import Link from 'next/link';
import { Check, CreditCard, MapPin, ShoppingBag } from 'lucide-react';

export function CheckoutProgress({ step, locked = false, onShipping }: {
  step: 1 | 2 | 3;
  locked?: boolean;
  onShipping?: () => void;
}) {
  const steps = [
    { label: 'سبد خرید', icon: ShoppingBag },
    { label: 'آدرس و ارسال', icon: MapPin },
    { label: 'پرداخت', icon: CreditCard },
  ];
  return (
    <nav aria-label="مراحل خرید" className="mb-8 rounded-2xl border border-gray-200 bg-white px-3 py-5 sm:px-8 sm:py-6">
      <ol className="flex items-center">
        {steps.map(({ label, icon: Icon }, index) => {
          const number = index + 1;
          const current = step === number;
          const complete = step > number;
          const content = <>
            <span className={'flex size-9 items-center justify-center rounded-full sm:size-11 ' + (current ? 'bg-orange-600 text-white ring-4 ring-orange-50' : complete ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-400')}>
              {complete ? <Check className="size-4 sm:size-5" /> : <Icon className="size-4 sm:size-5" />}
            </span>
            <span className={'text-[11px] sm:text-sm ' + (current ? 'font-bold text-orange-700' : complete ? 'text-gray-700' : 'text-gray-400')}>
              {number.toLocaleString('fa-IR')}. {label}
            </span>
          </>;
          const className = 'flex flex-col items-center gap-2 rounded-lg focus-visible:outline-orange-600';
          return <li key={label} aria-current={current ? 'step' : undefined} className="flex flex-1 items-center">
            <div className="flex flex-1 justify-center">
              {number === 1 && complete && !locked ? <Link href="/cart" className={className}>{content}</Link>
                : number === 2 && step === 1 ? <Link href="/checkout" className={className}>{content}</Link>
                  : number === 2 && complete && onShipping && !locked ? <button type="button" onClick={onShipping} className={className}>{content}</button>
                    : <span className={className}>{content}</span>}
            </div>
            {number < 3 && <span aria-hidden="true" className={'h-px w-5 sm:w-16 ' + (complete ? 'bg-orange-300' : 'bg-gray-200')} />}
          </li>;
        })}
      </ol>
    </nav>
  );
}
