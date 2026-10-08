import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Lock,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Banknote,
  ArrowRight,
  CheckCircle2,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ShoeProduct, STORE_INFO } from '../data/catalog';
import { ProductImage } from './ProductImage';
import { FIELD_LIMITS, VALIDATION_PATTERNS } from '../lib/validation';

export interface CartItem {
  product: ShoeProduct;
  size: string;
  colorway: string;
  quantity: number;
}

export interface SavedContactInfo {
  email: string;
  phone: string;
  streetAddress: string;
  landmark: string;
  city: string;
  postalCode: string;
}

export interface CheckoutSubmissionPayload {
  customerName: string;
  email: string;
  phone: string;
  streetAddress: string;
  landmark: string;
  city: string;
  postalCode: string;
  paymentMethod: 'upi' | 'card' | 'cod';
}

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  user: User | null;
  savedContact: SavedContactInfo | null;
  onSignInRequest: () => Promise<void>;
  onSubmitOrder: (payload: CheckoutSubmissionPayload) => Promise<{
    orderId: string;
    orderNumber: string;
  }>;
  onNavigateToOrder: (orderNumber: string) => void;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  user,
  savedContact,
  onSignInRequest,
  onSubmitOrder,
  onNavigateToOrder,
}) => {
  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmed'>('bag');
  const [customerName, setCustomerName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('7470405204');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('Near Jagannath Chowk, Kota');
  const [city, setCity] = useState<string>('Raipur');
  const [postalCode, setPostalCode] = useState<string>('492010');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cod'>('upi');

  // Payment method specific verification inputs
  const [upiId, setUpiId] = useState<string>('customer@okaxis');
  const [cardNumber, setCardNumber] = useState<string>('4532 •••• •••• 8891');
  const [cardExpiry, setCardExpiry] = useState<string>('08/29');
  const [cardCvv, setCardCvv] = useState<string>('842');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedOrderNumber, setConfirmedOrderNumber] = useState<string>('');

  useEffect(() => {
    if (user) {
      setCustomerName(user.displayName || 'Valued Customer');
      setEmail(user.email || '');
    }
    if (savedContact) {
      if (savedContact.email) setEmail(savedContact.email);
      if (savedContact.phone) setPhone(savedContact.phone);
      if (savedContact.streetAddress) setStreetAddress(savedContact.streetAddress);
      if (savedContact.landmark) setLandmark(savedContact.landmark);
      if (savedContact.city) setCity(savedContact.city);
      if (savedContact.postalCode) setPostalCode(savedContact.postalCode);
    }
  }, [user, savedContact]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shippingFee =
    subtotal === 0 || subtotal >= STORE_INFO.freeShippingThreshold
      ? 0
      : STORE_INFO.standardShippingFee;
  const totalAmount = subtotal + shippingFee;

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user) {
      setFormError('Please sign in with your verified Google account to complete checkout.');
      return;
    }

    const trimmedName = customerName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedStreet = streetAddress.trim();
    const trimmedLandmark = landmark.trim();
    const trimmedCity = city.trim();
    const trimmedPin = postalCode.trim();

    if (
      trimmedName.length < FIELD_LIMITS.userDisplayName.min ||
      trimmedName.length > FIELD_LIMITS.userDisplayName.max
    ) {
      setFormError('Recipient name must be between 2 and 80 characters.');
      return;
    }
    if (!VALIDATION_PATTERNS.EMAIL.test(trimmedEmail)) {
      setFormError('Please enter a valid email address for order update notifications.');
      return;
    }
    if (
      trimmedPhone.length < FIELD_LIMITS.phone.min ||
      trimmedPhone.length > FIELD_LIMITS.phone.max ||
      !VALIDATION_PATTERNS.PHONE.test(trimmedPhone)
    ) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (
      trimmedStreet.length < FIELD_LIMITS.streetAddress.min ||
      trimmedStreet.length > FIELD_LIMITS.streetAddress.max
    ) {
      setFormError('Please enter your complete house/flat number and street address.');
      return;
    }
    if (
      trimmedLandmark.length < FIELD_LIMITS.landmark.min ||
      trimmedLandmark.length > FIELD_LIMITS.landmark.max
    ) {
      setFormError('Please provide a nearby landmark (e.g. Near Jagannath Chowk, Kota).');
      return;
    }
    if (!VALIDATION_PATTERNS.POSTAL_CODE.test(trimmedPin)) {
      setFormError('Please enter a valid 6-digit Indian PIN code (e.g. 492010 for Raipur).');
      return;
    }
    if (paymentMethod === 'upi' && !upiId.includes('@')) {
      setFormError('Please enter a valid UPI ID (e.g. name@okaxis or mobile@ybl).');
      return;
    }
    if (paymentMethod === 'card' && cardCvv.trim().length < 3) {
      setFormError('Please enter a valid 3-digit security CVV.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmitOrder({
        customerName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        streetAddress: trimmedStreet,
        landmark: trimmedLandmark,
        city: trimmedCity,
        postalCode: trimmedPin,
        paymentMethod,
      });
      setConfirmedOrderNumber(result.orderNumber);
      setStep('confirmed');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to process order. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag and Secure Checkout"
    >
      <div className="w-full max-w-lg bg-[#F8F7F4] h-full flex flex-col justify-between border-l border-stone-300 shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              {step === 'bag' && 'Your Shopping Bag'}
              {step === 'checkout' && 'Secure Checkout & Payment'}
              {step === 'confirmed' && 'Order Confirmed'}
            </h2>
            <p className="text-xs text-stone-500">
              {STORE_INFO.fullName} · {STORE_INFO.addressLine}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (step === 'confirmed') setStep('bag');
              onClose();
            }}
            aria-label="Close shopping bag"
            className="p-2 text-stone-500 hover:text-stone-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'confirmed' ? (
            <div className="bg-white border border-stone-200 p-6 space-y-5">
              <div className="flex items-center gap-3 text-emerald-800">
                <CheckCircle2 className="w-7 h-7 shrink-0" />
                <div>
                  <p className="text-xs font-mono-tabular uppercase text-stone-500">
                    Reference #{confirmedOrderNumber}
                  </p>
                  <h3 className="text-lg font-bold text-stone-900">
                    Thank you for ordering from Hello Shoes Raipur
                  </h3>
                </div>
              </div>

              <p className="text-sm text-stone-600 leading-relaxed">
                Your order <strong className="text-stone-900">{confirmedOrderNumber}</strong> has been registered at our Jagannath Chowk, Kota atelier. An automated order confirmation email has been dispatched to{' '}
                <strong className="text-stone-900">{email}</strong>.
              </p>

              <div className="p-4 bg-[#F8F7F4] border border-stone-200 text-xs space-y-1.5 text-stone-700">
                <p className="font-semibold text-stone-900">Next Fulfillment Steps:</p>
                <p>1. Atelier Last & Sole Inspection at Jagannath Chowk, Kota</p>
                <p>2. Protective Dust-Bag Packaging & Courier Dispatch</p>
                <p>3. Real-time Email Notification & Doorstep Handover</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const orderRef = confirmedOrderNumber;
                    setStep('bag');
                    onClose();
                    onNavigateToOrder(orderRef);
                  }}
                  className="flex-1 px-4 py-3 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors text-center whitespace-nowrap"
                >
                  Track Live Order Status
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('bag');
                    onClose();
                  }}
                  className="px-4 py-3 text-xs font-semibold text-stone-800 bg-[#EFECE6] hover:bg-stone-300 transition-colors whitespace-nowrap"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <p className="text-base font-semibold text-stone-800">Your shopping bag is empty</p>
              <p className="text-xs text-stone-500 mt-1 max-w-xs">
                Explore our handcrafted leather loafers, court high-tops, and carbon runners crafted for Raipur streets.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-5 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors whitespace-nowrap"
              >
                Explore Footwear Gallery
              </button>
            </div>
          ) : step === 'bag' ? (
            <div className="space-y-4">
              {/* Free shipping threshold notice */}
              <div className="p-3.5 bg-white border border-stone-200 text-xs text-stone-700 flex items-center justify-between">
                <span>
                  {subtotal >= STORE_INFO.freeShippingThreshold
                    ? 'Unlocked: Complimentary Express Delivery across Raipur & Chhattisgarh'
                    : `Add ₹${(STORE_INFO.freeShippingThreshold - subtotal).toLocaleString('en-IN')} more for Free Express Delivery`}
                </span>
                <span className="font-mono-tabular font-semibold text-emerald-800">
                  {subtotal >= STORE_INFO.freeShippingThreshold ? 'FREE' : `₹${STORE_INFO.standardShippingFee}`}
                </span>
              </div>

              {/* Cart Items */}
              <div className="divide-y divide-stone-200 bg-white border border-stone-200">
                {cart.map((item, idx) => (
                  <div key={`${item.product.id}-${item.size}-${item.colorway}`} className="p-4 flex gap-4">
                    <div className="w-20 h-20 bg-[#EFECE6] shrink-0 border border-stone-200 overflow-hidden">
                      <ProductImage
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-stone-900 truncate">
                          {item.product.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(idx)}
                          aria-label={`Remove ${item.product.name}`}
                          className="text-stone-400 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {item.size} · {item.colorway}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center border border-stone-300">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(idx, -1)}
                            className="px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                          >
                            −
                          </button>
                          <span className="px-2.5 py-1 text-xs font-mono-tabular font-medium text-stone-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(idx, 1)}
                            className="px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-mono-tabular font-semibold text-stone-900">
                          ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Step === 'checkout' */
            <form id="checkout-form" onSubmit={validateAndSubmit} className="space-y-5">
              {!user && (
                <div className="p-4 bg-amber-50/90 border border-amber-300 text-xs text-stone-800 space-y-2.5">
                  <p className="font-semibold text-stone-900">
                    Sign In Required for Verified Order & Email Tracking
                  </p>
                  <p className="text-stone-600">
                    Sign in with Google so we can link your live order tracking dashboard and send automated status updates to your verified email.
                  </p>
                  <button
                    type="button"
                    onClick={onSignInRequest}
                    className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors whitespace-nowrap"
                  >
                    Sign In with Google to Continue
                  </button>
                </div>
              )}

              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-300 text-xs text-red-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Delivery Address Details (Isolated in /users/{uid}/private/contact) */}
              <div className="bg-white border border-stone-200 p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-800" />
                    Delivery & Contact Details
                  </span>
                  <span className="text-xs text-stone-500">PII Encrypted Vault</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={FIELD_LIMITS.userDisplayName.max}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-stone-300 focus:outline-none focus:border-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={FIELD_LIMITS.phone.max}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F7F4] border border-stone-300 focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Notification Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={FIELD_LIMITS.email.max}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@example.com"
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-stone-300 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    House / Flat / Street Address *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={FIELD_LIMITS.streetAddress.max}
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. Plot 24, Sector 2, Shankar Nagar"
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-stone-300 focus:outline-none focus:border-stone-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Landmark *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={FIELD_LIMITS.landmark.max}
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="Near Jagannath Chowk"
                      className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-stone-300 focus:outline-none focus:border-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={FIELD_LIMITS.city.max}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-stone-300 focus:outline-none focus:border-stone-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="492010"
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F7F4] border border-stone-300 focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>
              </div>

              {/* Secure Payment Gateway Selector */}
              <div className="bg-white border border-stone-200 p-4 space-y-3.5">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-800" />
                    Secure Payment Method
                  </span>
                  <span className="text-xs text-stone-500">256-Bit TLS Encrypted</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 border text-left transition-colors ${
                      paymentMethod === 'upi'
                        ? 'border-amber-800 bg-amber-950/5 text-stone-900'
                        : 'border-stone-200 bg-[#F8F7F4] text-stone-600 hover:border-stone-400'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-amber-800 mb-1" />
                    <p className="text-xs font-semibold">UPI Instant</p>
                    <p className="text-[11px] text-stone-500">GPay / PhonePe</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 border text-left transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-amber-800 bg-amber-950/5 text-stone-900'
                        : 'border-stone-200 bg-[#F8F7F4] text-stone-600 hover:border-stone-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-800 mb-1" />
                    <p className="text-xs font-semibold">Card</p>
                    <p className="text-[11px] text-stone-500">Visa / RuPay</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-3 border text-left transition-colors ${
                      paymentMethod === 'cod'
                        ? 'border-amber-800 bg-amber-950/5 text-stone-900'
                        : 'border-stone-200 bg-[#F8F7F4] text-stone-600 hover:border-stone-400'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-amber-800 mb-1" />
                    <p className="text-xs font-semibold">Cash / Pay</p>
                    <p className="text-[11px] text-stone-500">On Delivery</p>
                  </button>
                </div>

                {paymentMethod === 'upi' && (
                  <div className="pt-2 space-y-2">
                    <label className="block text-xs font-medium text-stone-700">
                      Verified UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="name@okaxis"
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F7F4] border border-stone-300 focus:outline-none focus:border-stone-900"
                    />
                    <p className="text-[11px] text-stone-500">
                      Instant payment confirmation to Hello Shoes Raipur Merchant Account (Jagannath Chowk, Kota).
                    </p>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="pt-2 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F7F4] border border-stone-300"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          Expiry (MM/YY)
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F7F4] border border-stone-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-700 mb-1">
                          CVV
                        </label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F7F4] border border-stone-300"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <div className="pt-2 p-3 bg-[#F8F7F4] border border-stone-200 text-xs text-stone-600">
                    Pay via Cash or UPI QR directly to our Hello Shoes Raipur courier partner upon doorstep verification at {city} ({postalCode}).
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {cart.length > 0 && step !== 'confirmed' && (
          <div className="p-6 bg-white border-t border-stone-200 space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} pairs)</span>
                <span className="font-mono-tabular">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Raipur & Chhattisgarh Courier</span>
                <span className="font-mono-tabular">
                  {shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Total Payable</span>
                <span className="font-mono-tabular">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="w-full py-3.5 px-5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                Proceed to Secure Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('bag')}
                  className="px-4 py-3.5 text-xs font-semibold text-stone-700 bg-[#EFECE6] hover:bg-stone-300 transition-colors whitespace-nowrap"
                >
                  Back to Bag
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 px-5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isSubmitting
                    ? 'Processing Secure Order...'
                    : `Authorize Order · ₹${totalAmount.toLocaleString('en-IN')}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
