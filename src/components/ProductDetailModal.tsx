import React, { useState } from 'react';
import {
  X,
  Star,
  Share2,
  Check,
  Copy,
  ShoppingBag,
  ShieldCheck,
  Truck,
  MapPin,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { ShoeProduct, STORE_INFO } from '../data/catalog';
import { ProductImage } from './ProductImage';

export interface FirestoreReview {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  authorName: string;
  rating: number;
  title: string;
  comment: string;
  sizePurchased: string;
  status: 'published' | 'archived';
  createdAt?: { toDate?: () => Date } | null;
}

interface ProductDetailModalProps {
  product: ShoeProduct | null;
  onClose: () => void;
  onAddToCart: (product: ShoeProduct, size: string, colorway: string, quantity: number) => void;
  onBuyNow: (product: ShoeProduct, size: string, colorway: string, quantity: number) => void;
  reviews: FirestoreReview[];
  onOpenReviewForm: (product: ShoeProduct) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  reviews,
  onOpenReviewForm,
}) => {
  if (!product) return null;

  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[2] || product.sizes[0]);
  const [selectedColorway, setSelectedColorway] = useState<string>(product.colorways[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showSizeGuide, setShowSizeGuide] = useState<boolean>(false);

  const productReviews = reviews.filter((r) => r.productId === product.id);
  const averageRating =
    productReviews.length > 0
      ? (
          productReviews.reduce((acc, r) => acc + r.rating, 0) / productReviews.length
        ).toFixed(1)
      : product.defaultRating.toFixed(1);
  const totalReviewCount = product.defaultReviewCount + productReviews.length;

  const shareUrl = `${window.location.origin}/?product=${encodeURIComponent(product.id)}`;
  const shareText = `Check out the ${product.name} (₹${product.price.toLocaleString('en-IN')}) at Hello Shoes, Jagannath Chowk, Kota, Raipur!`;

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} — Hello Shoes Raipur`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User dismissed share sheet
      }
    } else {
      handleCopyShareLink();
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-modal-title"
    >
      <div className="relative w-full max-w-5xl bg-[#F8F7F4] border border-stone-300 shadow-2xl my-auto overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>{product.category}</span>
            <span aria-hidden="true">·</span>
            <span>{product.originNote}</span>
            <span aria-hidden="true">·</span>
            <span className="text-stone-800 font-medium">{product.stockStatus}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="p-2 text-stone-500 hover:text-stone-900 transition-colors focus-visible:outline-2 focus-visible:outline-amber-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contiguous Purchase Module Layout: Left Gallery, Right Purchase Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[82vh] overflow-y-auto">
          {/* Left Column: Studio Product Gallery & Social Sharing */}
          <div className="lg:col-span-6 p-6 sm:p-8 bg-[#EFECE6] flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-stone-200">
            <div>
              <div className="aspect-4/3 w-full bg-[#E7E3DC] overflow-hidden border border-stone-200/80">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  categoryLabel={product.category}
                  className="w-full h-full"
                />
              </div>

              {/* Technical Craftsmanship Specs */}
              <div className="mt-6 pt-6 border-t border-stone-300/80 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-stone-500">Upper Material</p>
                  <p className="font-medium text-stone-900 mt-0.5">{product.material}</p>
                </div>
                <div>
                  <p className="text-stone-500">Single Shoe Weight</p>
                  <p className="font-mono-tabular font-medium text-stone-900 mt-0.5">
                    {product.weightGrams} g (UK 8)
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-stone-500">Outsole Architecture</p>
                  <p className="font-medium text-stone-900 mt-0.5">{product.soleSpec}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-stone-500">Atelier Care Protocol</p>
                  <p className="text-stone-700 mt-0.5">{product.careGuide}</p>
                </div>
              </div>
            </div>

            {/* Social Media Integration for Sharing */}
            <div className="mt-8 pt-5 border-t border-stone-300/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-amber-800" />
                  Share with Friends & Style Circle
                </span>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="text-xs text-amber-900 hover:underline font-medium whitespace-nowrap"
                >
                  System Share
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-stone-300 text-stone-800 hover:border-stone-900 transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                  WhatsApp
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
                <a
                  href={twitterHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-stone-300 text-stone-800 hover:border-stone-900 transition-colors whitespace-nowrap"
                >
                  Share on X
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
                <a
                  href={facebookHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-stone-300 text-stone-800 hover:border-stone-900 transition-colors whitespace-nowrap"
                >
                  Facebook
                  <ExternalLink className="w-3 h-3 text-stone-400" />
                </a>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors whitespace-nowrap"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Link Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Product Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Contiguous Purchase Module */}
          <div className="lg:col-span-6 p-6 sm:p-8 bg-white flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-xs text-stone-600">
                  <Star className="w-4 h-4 fill-amber-600 text-amber-600" />
                  <span className="font-mono-tabular font-semibold text-stone-900">
                    {averageRating}
                  </span>
                  <span>·</span>
                  <span>{totalReviewCount} Verified Reviews</span>
                </div>
                <span className="text-xs text-stone-500 font-mono-tabular">
                  SKU: {product.id.toUpperCase()}
                </span>
              </div>

              <h2
                id="pdp-modal-title"
                className="text-2xl sm:text-3xl font-bold text-stone-900 mt-2 tracking-tight"
              >
                {product.name}
              </h2>

              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-2xl font-semibold font-mono-tabular text-stone-900">
                  ₹{product.price.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-stone-500">
                  Inclusive of all taxes · Free Raipur Express Delivery
                </span>
              </div>

              <p className="mt-4 text-sm text-stone-600 leading-relaxed">
                {product.description}
              </p>

              {/* Colorway Selector */}
              <div className="mt-6">
                <label className="block text-xs font-medium text-stone-700 mb-2">
                  Selected Finish: <span className="text-stone-900 font-semibold">{selectedColorway}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.colorways.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColorway(color)}
                      className={`px-3.5 py-2 text-xs font-medium border transition-colors whitespace-nowrap ${
                        selectedColorway === color
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-300 bg-white text-stone-700 hover:border-stone-600'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* UK Size Selector */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-stone-700">
                    Select Size (UK Standard): <span className="text-stone-900 font-semibold">{selectedSize}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(!showSizeGuide)}
                    className="text-xs text-amber-900 hover:underline font-medium"
                  >
                    {showSizeGuide ? 'Hide Size Chart' : 'UK to CM Size Guide'}
                  </button>
                </div>

                {showSizeGuide && (
                  <div className="mb-3 p-3 bg-[#F8F7F4] border border-stone-200 text-xs text-stone-700">
                    <p className="font-semibold text-stone-900 mb-1.5">
                      Hello Shoes Raipur Last Measurement (Foot Length in CM)
                    </p>
                    <div className="grid grid-cols-6 gap-1 text-center font-mono-tabular">
                      <div className="p-1 bg-white border border-stone-200">UK 6<br />24.5cm</div>
                      <div className="p-1 bg-white border border-stone-200">UK 7<br />25.4cm</div>
                      <div className="p-1 bg-white border border-stone-200">UK 8<br />26.2cm</div>
                      <div className="p-1 bg-white border border-stone-200">UK 9<br />27.1cm</div>
                      <div className="p-1 bg-white border border-stone-200">UK 10<br />27.9cm</div>
                      <div className="p-1 bg-white border border-stone-200">UK 11<br />28.8cm</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`py-2.5 text-xs font-mono-tabular font-medium border transition-colors whitespace-nowrap ${
                        selectedSize === size
                          ? 'border-amber-800 bg-amber-800 text-white'
                          : 'border-stone-300 bg-white text-stone-800 hover:border-stone-900'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity & Primary Purchase CTAs */}
              <div className="mt-6 pt-6 border-t border-stone-200 flex flex-col sm:flex-row gap-3">
                <div className="inline-flex items-center border border-stone-300 bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="px-3.5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
                  >
                    −
                  </button>
                  <span className="px-4 py-2.5 text-sm font-mono-tabular font-semibold text-stone-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                    aria-label="Increase quantity"
                    className="px-3.5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product, selectedSize, selectedColorway, quantity);
                    onClose();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Add to Bag · ₹{(product.price * quantity).toLocaleString('en-IN')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onBuyNow(product, selectedSize, selectedColorway, quantity);
                  }}
                  className="px-5 py-3 text-xs font-semibold text-stone-900 bg-[#EFECE6] hover:bg-stone-300 transition-colors whitespace-nowrap"
                >
                  Instant Checkout
                </button>
              </div>

              {/* Store Pickup & Guarantee Info */}
              <div className="mt-6 p-4 bg-[#F8F7F4] border border-stone-200 space-y-2 text-xs text-stone-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-800 shrink-0" />
                  <span>
                    In-store trial & pickup available at{' '}
                    <strong className="text-stone-900">{STORE_INFO.addressLine}</strong> ({STORE_INFO.phoneDisplay})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-stone-700 shrink-0" />
                  <span>Same-day dispatch across Raipur (Kota, Shankar Nagar, Civil Lines, Tatibandh)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-stone-700 shrink-0" />
                  <span>7-day size exchange guarantee & verified email tracking updates</span>
                </div>
              </div>
            </div>

            {/* Product Customer Reviews Preview inside PDP */}
            <div className="mt-6 pt-5 border-t border-stone-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-stone-900">
                  Customer Fit & Wear Reviews ({productReviews.length} live entries)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReviewForm(product);
                  }}
                  className="text-xs font-medium text-amber-800 hover:underline whitespace-nowrap"
                >
                  Write a Review for this Pair
                </button>
              </div>

              {productReviews.length === 0 ? (
                <p className="text-xs text-stone-500">
                  Rated {product.defaultRating}/5 across {product.defaultReviewCount} in-store buyers at Jagannath Chowk. Be the first to post an online review for this model.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                  {productReviews.slice(0, 3).map((rev) => (
                    <div key={rev.id} className="p-3 bg-[#F8F7F4] border border-stone-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-900">{rev.title}</span>
                        <span className="font-mono-tabular text-amber-800 font-medium">
                          {rev.rating}.0 ★
                        </span>
                      </div>
                      <p className="text-stone-600 mt-1 line-clamp-2">{rev.comment}</p>
                      <p className="text-stone-400 mt-1">
                        {rev.authorName} · Purchased {rev.sizePurchased}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
