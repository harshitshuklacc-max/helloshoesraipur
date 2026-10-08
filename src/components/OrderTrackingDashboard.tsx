import React, { useState } from 'react';
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { STORE_INFO } from '../data/catalog';

export interface FirestoreOrder {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  deliveryArea: string;
  paymentMethod: 'upi' | 'card' | 'cod';
  paymentStatus: 'paid' | 'cod_pending' | 'refunded';
  status:
    | 'confirmed'
    | 'crafting_inspection'
    | 'out_for_delivery'
    | 'delivered'
    | 'cancelled';
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
  primaryProductTitle: string;
  createdAt?: { toDate?: () => Date } | null;
  updatedAt?: { toDate?: () => Date } | null;
}

export interface FirestoreOrderItem {
  id: string;
  orderId: string;
  userId: string;
  productId: string;
  productName: string;
  size: string;
  colorway: string;
  unitPrice: number;
  quantity: number;
}

interface OrderTrackingDashboardProps {
  user: User | null;
  orders: FirestoreOrder[];
  orderItemsMap: Record<string, FirestoreOrderItem[]>;
  initialSearchQuery?: string;
  onSignInRequest: () => Promise<void>;
  onAdvanceOrderStatus: (order: FirestoreOrder) => Promise<void>;
  onCancelOrder: (order: FirestoreOrder) => Promise<void>;
  onLoadOrderItems: (orderId: string) => Promise<void>;
  onOpenNotifications: () => void;
}

const STAGES: {
  key: FirestoreOrder['status'];
  label: string;
  description: string;
}[] = [
  {
    key: 'confirmed',
    label: '01. Order Confirmed',
    description: 'Order registered at Hello Shoes, Jagannath Chowk, Kota, Raipur.',
  },
  {
    key: 'crafting_inspection',
    label: '02. Atelier Quality Inspection',
    description: 'Stitching, sole alignment, and size verification completed by master cobbler.',
  },
  {
    key: 'out_for_delivery',
    label: '03. Out for Delivery (Raipur Courier)',
    description: 'Dispatched from Kota Atelier with live doorstep handoff tracking.',
  },
  {
    key: 'delivered',
    label: '04. Delivered & Signed',
    description: 'Handed over to recipient. 7-day size exchange warranty active.',
  },
];

export const OrderTrackingDashboard: React.FC<OrderTrackingDashboardProps> = ({
  user,
  orders,
  orderItemsMap,
  initialSearchQuery = '',
  onSignInRequest,
  onAdvanceOrderStatus,
  onCancelOrder,
  onLoadOrderItems,
  onOpenNotifications,
}) => {
  const [searchCode, setSearchCode] = useState<string>(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(
    orders[0]?.id || null
  );
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchCode.trim() ||
      order.orderNumber.toLowerCase().includes(searchCode.trim().toLowerCase()) ||
      order.primaryProductTitle.toLowerCase().includes(searchCode.trim().toLowerCase()) ||
      order.deliveryArea.toLowerCase().includes(searchCode.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStageIndex = (status: FirestoreOrder['status']) => {
    if (status === 'cancelled') return -1;
    return STAGES.findIndex((s) => s.key === status);
  };

  const handleToggleExpand = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
      if (!orderItemsMap[orderId]) {
        await onLoadOrderItems(orderId);
      }
    }
  };

  const handleAdvance = async (order: FirestoreOrder) => {
    setUpdatingOrderId(order.id);
    try {
      await onAdvanceOrderStatus(order);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancel = async (order: FirestoreOrder) => {
    setUpdatingOrderId(order.id);
    try {
      await onCancelOrder(order);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-stone-200">
        <div>
          <p className="text-xs text-stone-500">
            Live Fulfillment Telemetry · {STORE_INFO.addressLine}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mt-1 tracking-tight">
            Order Tracking Dashboard
          </h1>
          <p className="text-sm text-stone-600 mt-2 max-w-2xl">
            Monitor real-time cobbler inspection and courier dispatch from Jagannath Chowk, Kota, Raipur. Every status change dispatches an instant transactional email notification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-900 bg-white border border-stone-300 hover:border-stone-900 transition-colors whitespace-nowrap"
          >
            <Mail className="w-4 h-4 text-amber-800" />
            View Order Email Log
          </button>
        </div>
      </div>

      {!user ? (
        <div className="mt-10 bg-white border border-stone-200 p-8 sm:p-12 text-center max-w-xl mx-auto">
          <Package className="w-10 h-10 text-amber-800 mx-auto mb-4 stroke-[1.5]" />
          <h2 className="text-xl font-bold text-stone-900">
            Sign in to View Your Live Footwear Orders
          </h2>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
            For customer privacy and zero-trust security, order histories and delivery addresses are isolated to your verified account.
          </p>
          <button
            type="button"
            onClick={onSignInRequest}
            className="mt-6 px-6 py-3 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors whitespace-nowrap"
          >
            Sign In with Google
          </button>
        </div>
      ) : (
        <>
          {/* Search & Status Filter Bar */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Search by Order # (e.g. HS-1042) or shoe model..."
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-stone-300 focus:outline-none focus:border-stone-900"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFECE6] border border-stone-200">
              {[
                { id: 'all', label: 'All Orders' },
                { id: 'confirmed', label: 'Confirmed' },
                { id: 'crafting_inspection', label: 'Inspection' },
                { id: 'out_for_delivery', label: 'Out for Delivery' },
                { id: 'delivered', label: 'Delivered' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="mt-8 bg-white border border-stone-200 p-10 text-center">
              <p className="text-base font-semibold text-stone-800">
                No matching footwear orders found
              </p>
              <p className="text-xs text-stone-500 mt-1">
                Place an order from our collection to test live 4-stage tracking and automated email notifications.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              {filteredOrders.map((order) => {
                const currentStageIdx = getStageIndex(order.status);
                const isExpanded = expandedOrderId === order.id;
                const items = orderItemsMap[order.id] || [];
                const createdDate = order.createdAt?.toDate
                  ? order.createdAt.toDate().toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Just now';

                return (
                  <div
                    key={order.id}
                    className="bg-white border border-stone-200 transition-colors"
                  >
                    {/* Top Summary Row */}
                    <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span className="font-mono-tabular font-bold text-stone-900 text-sm">
                            {order.orderNumber}
                          </span>
                          <span>·</span>
                          <span>Placed {createdDate}</span>
                          <span>·</span>
                          <span>
                            Payment: {order.paymentMethod.toUpperCase()} ({order.paymentStatus.replace('_', ' ')})
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-stone-900 mt-1">
                          {order.primaryProductTitle}
                          {order.itemCount > 1 ? ` + ${order.itemCount - 1} more` : ''}
                        </h2>
                        <p className="text-xs text-stone-600 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-800" />
                          Recipient: {order.customerName} · {order.deliveryArea}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-left lg:text-right">
                          <p className="text-xs text-stone-500">Total Amount</p>
                          <p className="text-lg font-mono-tabular font-bold text-stone-900">
                            ₹{order.totalAmount.toLocaleString('en-IN')}
                          </p>
                        </div>

                        {/* Interactive Fulfillment Simulator Controls */}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={updatingOrderId === order.id}
                              onClick={() => handleAdvance(order)}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {updatingOrderId === order.id
                                ? 'Updating...'
                                : 'Simulate Next Tracking Stage'}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>

                            {(order.status === 'confirmed' ||
                              order.status === 'crafting_inspection') && (
                              <button
                                type="button"
                                disabled={updatingOrderId === order.id}
                                onClick={() => handleCancel(order)}
                                className="px-3 py-2.5 text-xs font-medium text-red-800 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                              >
                                Cancel Order
                              </button>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleExpand(order.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-stone-700 bg-[#F8F7F4] border border-stone-200 hover:border-stone-400 transition-colors whitespace-nowrap"
                        >
                          {isExpanded ? (
                            <>
                              Hide Receipt <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Itemized Receipt <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 4-Stage Visual Progress Pipeline */}
                    <div className="p-6 bg-[#F8F7F4]">
                      {order.status === 'cancelled' ? (
                        <div className="flex items-center gap-3 text-red-800 p-4 bg-red-50 border border-red-200 text-xs">
                          <XCircle className="w-5 h-5 shrink-0" />
                          <div>
                            <p className="font-semibold">Order Cancelled</p>
                            <p className="text-red-700 mt-0.5">
                              This order was cancelled prior to courier dispatch. A cancellation confirmation email has been sent to your inbox.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {STAGES.map((stage, idx) => {
                            const isCompleted = idx <= currentStageIdx;
                            const isCurrent = idx === currentStageIdx;
                            return (
                              <div
                                key={stage.key}
                                className={`p-4 border transition-colors ${
                                  isCurrent
                                    ? 'bg-white border-amber-800'
                                    : isCompleted
                                    ? 'bg-white border-stone-300'
                                    : 'bg-[#EFECE6]/60 border-stone-200 opacity-60'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-mono-tabular font-semibold text-stone-900">
                                    {stage.label}
                                  </span>
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs text-stone-600 leading-relaxed">
                                  {stage.description}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Expandable Itemized Receipt & Atelier Support */}
                    {isExpanded && (
                      <div className="p-6 border-t border-stone-200 bg-white grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                        <div className="lg:col-span-8">
                          <h3 className="font-semibold text-stone-900 mb-3">
                            Ordered Footwear Line Items
                          </h3>
                          {items.length === 0 ? (
                            <div className="p-4 bg-[#F8F7F4] border border-stone-200 text-stone-600 flex items-center justify-between">
                              <span>
                                {order.primaryProductTitle} ({order.itemCount} pair
                                {order.itemCount > 1 ? 's' : ''})
                              </span>
                              <button
                                type="button"
                                onClick={() => onLoadOrderItems(order.id)}
                                className="text-amber-800 font-medium hover:underline"
                              >
                                Load Line Item Details
                              </button>
                            </div>
                          ) : (
                            <div className="divide-y divide-stone-200 border border-stone-200">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className="p-3.5 flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-semibold text-stone-900">
                                      {item.productName}
                                    </p>
                                    <p className="text-stone-500 mt-0.5">
                                      Size: {item.size} · Finish: {item.colorway} · Qty: {item.quantity}
                                    </p>
                                  </div>
                                  <span className="font-mono-tabular font-semibold text-stone-900">
                                    ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="lg:col-span-4 bg-[#F8F7F4] border border-stone-200 p-4 space-y-2.5">
                          <p className="font-semibold text-stone-900">
                            Dispatched From Hello Shoes Atelier
                          </p>
                          <p className="text-stone-600">{STORE_INFO.addressLine}</p>
                          <p className="text-stone-600">{STORE_INFO.cityStatePin}</p>
                          <div className="pt-2 border-t border-stone-200 flex items-center gap-2 text-stone-800 font-mono-tabular">
                            <Phone className="w-3.5 h-3.5 text-amber-800" />
                            <span>{STORE_INFO.phoneDisplay}</span>
                          </div>
                          <div className="flex items-center gap-2 text-stone-600">
                            <Truck className="w-3.5 h-3.5 text-stone-700" />
                            <span>Raipur Priority Courier Partner</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
};
