import React, { useState } from 'react';
import {
  Mail,
  CheckCheck,
  Clock,
  ArrowUpRight,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { STORE_INFO } from '../data/catalog';

export interface FirestoreEmailNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  recipientName: string;
  subject: string;
  bodyPreview: string;
  eventType:
    | 'order_confirmed'
    | 'status_update'
    | 'delivery_dispatched'
    | 'order_delivered'
    | 'order_cancelled';
  deliveryStatus: 'sent' | 'read';
  createdAt?: { toDate?: () => Date } | null;
}

interface EmailNotificationCenterProps {
  user: User | null;
  notifications: FirestoreEmailNotification[];
  onSignInRequest: () => Promise<void>;
  onMarkAsRead: (notification: FirestoreEmailNotification) => Promise<void>;
  onNavigateToOrder: (orderNumber: string) => void;
}

export const EmailNotificationCenter: React.FC<EmailNotificationCenterProps> = ({
  user,
  notifications,
  onSignInRequest,
  onMarkAsRead,
  onNavigateToOrder,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    notifications[0]?.id || null
  );
  const [eventFilter, setEventFilter] = useState<string>('all');

  const filteredNotifications = notifications.filter(
    (n) => eventFilter === 'all' || n.eventType === eventFilter
  );

  const activeNotification =
    filteredNotifications.find((n) => n.id === selectedId) ||
    filteredNotifications[0] ||
    null;

  const handleSelectNotification = async (notif: FirestoreEmailNotification) => {
    setSelectedId(notif.id);
    if (notif.deliveryStatus === 'sent') {
      await onMarkAsRead(notif);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-stone-200">
        <div>
          <p className="text-xs text-stone-500">
            Automated Transactional Dispatch · {STORE_INFO.email}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 mt-1 tracking-tight">
            Order Email Notification Center
          </h1>
          <p className="text-sm text-stone-600 mt-2 max-w-2xl">
            Every order placement, atelier cobbler inspection, courier dispatch from Jagannath Chowk, Kota, and doorstep delivery triggers an instant, verifiable email update below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFECE6] border border-stone-200">
          {[
            { id: 'all', label: 'All Emails' },
            { id: 'order_confirmed', label: 'Confirmation' },
            { id: 'status_update', label: 'Inspection' },
            { id: 'delivery_dispatched', label: 'Out for Delivery' },
            { id: 'order_delivered', label: 'Delivered' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setEventFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                eventFilter === tab.id
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!user ? (
        <div className="mt-10 bg-white border border-stone-200 p-8 sm:p-12 text-center max-w-xl mx-auto">
          <Mail className="w-10 h-10 text-amber-800 mx-auto mb-4 stroke-[1.5]" />
          <h2 className="text-xl font-bold text-stone-900">
            Sign in to Access Your Order Email Updates
          </h2>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
            Sign in with your Google account to view transactional receipts and live dispatch alerts from Hello Shoes Raipur.
          </p>
          <button
            type="button"
            onClick={onSignInRequest}
            className="mt-6 px-6 py-3 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors whitespace-nowrap"
          >
            Sign In with Google
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="mt-8 bg-white border border-stone-200 p-10 text-center">
          <p className="text-base font-semibold text-stone-800">
            No transactional order emails in this view yet
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Complete a checkout or advance an order stage in the Order Tracking Dashboard to see automated email updates appear in real time.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 border border-stone-200 bg-white min-h-[480px]">
          {/* Left Inbox Column */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-stone-200 divide-y divide-stone-200 max-h-[540px] overflow-y-auto">
            {filteredNotifications.map((notif) => {
              const isSelected = activeNotification?.id === notif.id;
              const isUnread = notif.deliveryStatus === 'sent';
              const formattedTime = notif.createdAt?.toDate
                ? notif.createdAt.toDate().toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Just now';

              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleSelectNotification(notif)}
                  className={`w-full text-left p-4 transition-colors block ${
                    isSelected
                      ? 'bg-[#F8F7F4]'
                      : isUnread
                      ? 'bg-amber-50/30 hover:bg-[#F8F7F4]'
                      : 'bg-white hover:bg-[#F8F7F4]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                    <span className="font-mono-tabular font-semibold text-stone-800">
                      {notif.orderNumber}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {isUnread ? (
                        <span className="font-semibold text-amber-800">New Dispatch</span>
                      ) : (
                        <span className="text-stone-400">Read</span>
                      )}
                      <span>·</span>
                      <span>{formattedTime}</span>
                    </span>
                  </div>
                  <p
                    className={`text-sm truncate ${
                      isUnread ? 'font-bold text-stone-900' : 'font-medium text-stone-800'
                    }`}
                  >
                    {notif.subject}
                  </p>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                    {notif.bodyPreview}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Email Reader Pane */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between bg-[#F8F7F4]/50">
            {activeNotification && (
              <>
                <div>
                  <div className="pb-6 border-b border-stone-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                      <span>From: {STORE_INFO.fullName} &lt;{STORE_INFO.email}&gt;</span>
                      <span className="flex items-center gap-1 font-mono-tabular">
                        {activeNotification.deliveryStatus === 'read' ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />
                            Opened & Verified
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-800" />
                            Dispatched
                          </>
                        )}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-stone-900 mt-3">
                      {activeNotification.subject}
                    </h2>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                      <span>To: {activeNotification.recipientName} ({user.email})</span>
                      <span>·</span>
                      <span className="font-mono-tabular">
                        Order Reference: {activeNotification.orderNumber}
                      </span>
                    </div>
                  </div>

                  {/* Transactional Email Body */}
                  <div className="mt-6 bg-white border border-stone-200 p-6 space-y-4 text-sm text-stone-700 leading-relaxed">
                    <p className="font-semibold text-stone-900">
                      Namaste {activeNotification.recipientName},
                    </p>
                    <p>{activeNotification.bodyPreview}</p>

                    <div className="p-4 bg-[#F8F7F4] border border-stone-200 text-xs space-y-1.5">
                      <p className="font-semibold text-stone-900">
                        Atelier Dispatch & Verification Summary
                      </p>
                      <p className="font-mono-tabular">
                        Order ID: {activeNotification.orderNumber}
                      </p>
                      <p>Origin: {STORE_INFO.fullName}, {STORE_INFO.addressLine}</p>
                      <p>Customer Helpline: {STORE_INFO.phoneDisplay}</p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => onNavigateToOrder(activeNotification.orderNumber)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors whitespace-nowrap"
                      >
                        Open Order {activeNotification.orderNumber} in Tracking Dashboard
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-800" />
                    <span>{STORE_INFO.addressLine}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono-tabular">
                    <Phone className="w-3.5 h-3.5 text-amber-800" />
                    <span>{STORE_INFO.phoneDisplay}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Authenticated Storefront Notification</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
