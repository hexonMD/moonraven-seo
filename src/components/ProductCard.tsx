import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/shopify';
import { formatMoney } from '@/lib/shopify';

export function ProductCard({ product }: { product: Product }) {
  const img = product.featuredImage ?? product.images.nodes[0] ?? null;
  const min = product.priceRangeV2?.minVariantPrice;
  const max = product.priceRangeV2?.maxVariantPrice;
  const priceLabel =
    min && max && min.amount === max.amount
      ? formatMoney(min)
      : min && max
        ? `From ${formatMoney(min)}`
        : null;

  return (
    <Link href={`/products/${product.handle}`} className="product-link group">
      <div className="aspect-square relative bg-[var(--color-bg-soft)] overflow-hidden">
        {img ? (
          <Image
            src={img.url}
            alt={img.altText ?? product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : null}
      </div>
      <div className="px-2 pt-3 pb-2 text-center">
        <p className="text-sm text-[var(--color-text)] leading-snug line-clamp-2">
          {product.title}
        </p>
        {priceLabel ? (
          <p className="mt-1 text-sm text-[var(--color-text-soft)]">{priceLabel}</p>
        ) : null}
      </div>
    </Link>
  );
}
