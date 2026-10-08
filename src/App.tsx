/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Search,
  ShoppingBag,
  Star,
  Share2,
  MapPin,
  Phone,
  ArrowRight,
  LogOut,
  User as UserIcon,
  Mail,
  Package,
  SlidersHorizontal,
  Check,
  MessageSquarePlus,
  Trash2,
  Menu,
  X,
} from 'lucide-react';

import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  SHOE_CATALOG,
  HERO_BANNER_IMAGE,
  STORE_INFO,
  CURATED_TESTIMONIALS,
  ShoeProduct,
} from './data/catalog';
import {
  FIELD_LIMITS,
  VALIDATION_PATTERNS,
  sanitizeString,
} from './lib/validation';
import { ProductImage } from './components/ProductImage';
import {
  ProductDetailModal,
  FirestoreReview,
} from './components/ProductDetailModal';
import {
  CartCheckoutDrawer,
  CartItem,
  SavedContactInfo,
  CheckoutSubmissionPayload,
} from './components/CartCheckoutDrawer';
import {
  OrderTrackingDashboard,
  FirestoreOrder,
  FirestoreOrderItem,
} from './components/OrderTrackingDashboard';
import {
  EmailNotificationCenter,
  FirestoreEmailNotification,
} from './components/EmailNotificationCenter';

type ActiveView = 'storefront' | 'orders' | 'notifications';

export default function App() {
  // Navigation & View State
  const [activeView, setActiveView] = useState<ActiveView>('storefront');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Auth & Profile State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [savedContact, setSavedContact] = useState<SavedContactInfo | null>(null);
  const [authErrorBanner, setAuthErrorBanner] = useState<string | null>(null);

  // Storefront Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Footwear');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState<string>('All Sizes');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');

  // Card Quick-Size Selection Map
  const [cardSelectedSizes, setCardSelectedSizes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    SHOE_CATALOG.forEach((p) => {
      initial[p.id] = p.sizes.includes('UK 8') ? 'UK 8' : p.sizes[0];
    });
    return initial;
  });

  // Modals & Drawers
  const [activeProductModal, setActiveProductModal] = useState<ShoeProduct | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cart, setCart] = useState<CartItem[]>([
    {
      product: SHOE_CATALOG[0],
      size: 'UK 8',
      colorway: SHOE_CATALOG[0].colorways[0],
      quantity: 1,
    },
  ]);

  // Live Firestore Data
  const [reviews, setReviews] = useState<FirestoreReview[]>([]);
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, FirestoreOrderItem[]>>({});
  const [notifications, setNotifications] = useState<FirestoreEmailNotification[]>([]);
  const [trackedOrderSearchCode, setTrackedOrderSearchCode] = useState<string>('');

  // Review Submission Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [reviewProductId, setReviewProductId] = useState<string>(SHOE_CATALOG[0].id);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewSize, setReviewSize] = useState<string>('UK 8');
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Toast Feedback for Cart, Share, and Email Notifications
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const showToast = (
    title: string,
    subtitle?: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    setToastMessage({ title, subtitle, actionLabel, onAction });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.title === title ? null : prev));
    }, 5000);
  };

  // Check URL query param for shared product link (?product=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedProductId = params.get('product');
    if (sharedProductId) {
      const found = SHOE_CATALOG.find((p) => p.id === sharedProductId);
      if (found) {
        setActiveProductModal(found);
      }
    }
  }, []);

  // 1. Firebase Auth Listener & User Profile Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);

      if (currentUser) {
        const userDocPath = `users/${currentUser.uid}`;
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const safeName = sanitizeString(
              currentUser.displayName || 'Hello Shoes Member',
              FIELD_LIMITS.userDisplayName.min,
              FIELD_LIMITS.userDisplayName.max,
              'Hello Shoes Member'
            );
            await setDoc(userRef, {
              uid: currentUser.uid,
              displayName: safeName,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          // Load isolated PII contact info if previously saved
          const contactRef = doc(db, 'users', currentUser.uid, 'private', 'contact');
          const contactSnap = await getDoc(contactRef);
          if (contactSnap.exists()) {
            const data = contactSnap.data();
            setSavedContact({
              email: data.email || currentUser.email || '',
              phone: data.phone || '7470405204',
              streetAddress: data.streetAddress || '',
              landmark: data.landmark || 'Near Jagannath Chowk, Kota',
              city: data.city || 'Raipur',
              postalCode: data.postalCode || '492010',
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, userDocPath);
        }
      } else {
        setSavedContact(null);
        setOrders([]);
        setNotifications([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Public Published Product Reviews Listener (/reviews where status == 'published')
  useEffect(() => {
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('status', '==', 'published')
    );

    const unsubscribe = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const loaded: FirestoreReview[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FirestoreReview, 'id'>),
        }));
        loaded.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.now();
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Date.now();
          return tB - tA;
        });
        setReviews(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reviews');
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Authenticated User Orders & Email Notifications Listeners
  useEffect(() => {
    if (!authReady || !user) return;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const loadedOrders: FirestoreOrder[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FirestoreOrder, 'id'>),
        }));
        loadedOrders.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.now();
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Date.now();
          return tB - tA;
        });
        setOrders(loadedOrders);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );
    const unsubNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const loadedNotifs: FirestoreEmailNotification[] = snapshot.docs.map(
          (docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<FirestoreEmailNotification, 'id'>),
          })
        );
        loadedNotifs.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : Date.now();
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : Date.now();
          return tB - tA;
        });
        setNotifications(loadedNotifs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    return () => {
      unsubOrders();
      unsubNotifications();
    };
  }, [authReady, user]);

  // Sign In Handler
  const handleGoogleSignIn = async () => {
    setAuthErrorBanner(null);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast(
        'Signed in to Hello Shoes Raipur',
        'Your orders, reviews, and email updates are now synced.'
      );
    } catch (error) {
      setAuthErrorBanner(
        error instanceof Error
          ? error.message
          : 'Sign-in popup was closed before completing authentication.'
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setActiveView('storefront');
    showToast('Signed out', 'Come back soon to Hello Shoes Raipur.');
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = SHOE_CATALOG.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All Footwear' || product.category === selectedCategory;
      const matchesSize =
        selectedSizeFilter === 'All Sizes' || product.sizes.includes(selectedSizeFilter);
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.material.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.colorways.some((c) => c.toLowerCase().includes(q));
      return matchesCategory && matchesSize && matchesSearch;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price-desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    if (sortBy === 'rating') {
      return [...list].sort((a, b) => b.defaultRating - a.defaultRating);
    }
    return list;
  }, [searchQuery, selectedCategory, selectedSizeFilter, sortBy]);

  // Cart Handlers
  const handleAddToCart = (
    product: ShoeProduct,
    size: string,
    colorway: string,
    quantity: number
  ) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.size === size &&
          item.colorway === colorway
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: Math.min(20, updated[existingIndex].quantity + quantity),
        };
        return updated;
      }
      return [...prev, { product, size, colorway, quantity }];
    });

    showToast(
      `Added ${product.name} (${size}) to Bag`,
      `Finish: ${colorway}`,
      'Open Bag',
      () => setIsCartOpen(true)
    );
  };

  const handleBuyNow = (
    product: ShoeProduct,
    size: string,
    colorway: string,
    quantity: number
  ) => {
    handleAddToCart(product, size, colorway, quantity);
    setActiveProductModal(null);
    setIsCartOpen(true);
  };

  const handleUpdateCartQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const nextQty = updated[index].quantity + delta;
      if (nextQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = { ...updated[index], quantity: Math.min(20, nextQty) };
      }
      return updated;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Checkout Submission (Atomic Batch: UserProfile + PrivateContact + Order + OrderItems + EmailNotification)
  const handleCheckoutSubmit = async (
    payload: CheckoutSubmissionPayload
  ): Promise<{ orderId: string; orderNumber: string }> => {
    if (!user) {
      throw new Error('Authentication required to place an order.');
    }

    const orderNumber = `HS-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const notifId = `eml_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
    const shippingFee =
      subtotal >= STORE_INFO.freeShippingThreshold ? 0 : STORE_INFO.standardShippingFee;
    const totalAmount = subtotal + shippingFee;
    const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

    const safeCustomerName = sanitizeString(
      payload.customerName,
      FIELD_LIMITS.userDisplayName.min,
      FIELD_LIMITS.userDisplayName.max,
      'Valued Customer'
    );
    const safeDeliveryArea = sanitizeString(
      `${payload.landmark}, ${payload.city} - ${payload.postalCode}`,
      FIELD_LIMITS.deliveryArea.min,
      FIELD_LIMITS.deliveryArea.max,
      'Kota, Raipur - 492010'
    );
    const primaryProductTitle = sanitizeString(
      cart[0]?.product.name || 'Hello Shoes Footwear',
      2,
      120,
      'Hello Shoes Footwear'
    );

    const batch = writeBatch(db);

    // 1. Ensure public UserProfile exists/updates
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      batch.set(userRef, {
        uid: user.uid,
        displayName: safeCustomerName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 2. Store isolated PII in /users/{uid}/private/contact
    const privateContactRef = doc(db, 'users', user.uid, 'private', 'contact');
    const contactSnap = await getDoc(privateContactRef);
    const contactPayload = {
      uid: user.uid,
      email: payload.email.trim().slice(0, FIELD_LIMITS.email.max),
      phone: payload.phone.trim().slice(0, FIELD_LIMITS.phone.max),
      streetAddress: sanitizeString(
        payload.streetAddress,
        FIELD_LIMITS.streetAddress.min,
        FIELD_LIMITS.streetAddress.max,
        'Jagannath Chowk, Kota'
      ),
      landmark: sanitizeString(
        payload.landmark,
        FIELD_LIMITS.landmark.min,
        FIELD_LIMITS.landmark.max,
        'Near Jagannath Chowk'
      ),
      city: sanitizeString(
        payload.city,
        FIELD_LIMITS.city.min,
        FIELD_LIMITS.city.max,
        'Raipur'
      ),
      postalCode: payload.postalCode.trim().slice(0, 6),
      updatedAt: serverTimestamp(),
    };
    if (contactSnap.exists()) {
      batch.update(privateContactRef, contactPayload);
    } else {
      batch.set(privateContactRef, contactPayload);
    }

    // 3. Create /orders/{orderId}
    const orderRef = doc(db, 'orders', orderId);
    batch.set(orderRef, {
      orderNumber,
      userId: user.uid,
      customerName: safeCustomerName,
      deliveryArea: safeDeliveryArea,
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentMethod === 'cod' ? 'cod_pending' : 'paid',
      status: 'confirmed',
      subtotal,
      shippingFee,
      totalAmount,
      itemCount: Math.min(50, Math.max(1, itemCount)),
      primaryProductTitle,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 4. Create /orders/{orderId}/items/{itemId} subcollection documents
    cart.forEach((item, index) => {
      const itemId = `item_${index + 1}_${Date.now()}`;
      const itemRef = doc(db, 'orders', orderId, 'items', itemId);
      batch.set(itemRef, {
        orderId,
        userId: user.uid,
        productId: item.product.id,
        productName: sanitizeString(item.product.name, 2, 120, 'Hello Shoes Pair'),
        size: VALIDATION_PATTERNS.UK_SIZE.test(item.size) ? item.size : 'UK 8',
        colorway: sanitizeString(item.colorway, 2, 60, 'Standard'),
        unitPrice: item.product.price,
        quantity: Math.min(20, Math.max(1, item.quantity)),
        createdAt: serverTimestamp(),
      });
    });

    // 5. Dispatch automated Order Confirmation Email Notification (/notifications/{notifId})
    const notifRef = doc(db, 'notifications', notifId);
    const emailSubject = sanitizeString(
      `Order Confirmed (${orderNumber}) — ${primaryProductTitle}`,
      FIELD_LIMITS.notificationSubject.min,
      FIELD_LIMITS.notificationSubject.max,
      `Order Confirmed (${orderNumber})`
    );
    const emailBody = sanitizeString(
      `Your order ${orderNumber} for ${itemCount} pair(s) totaling ₹${totalAmount.toLocaleString('en-IN')} via ${payload.paymentMethod.toUpperCase()} has been confirmed at Hello Shoes, Jagannath Chowk, Kota, Raipur. Our master cobblers have begun pre-dispatch inspection.`,
      FIELD_LIMITS.notificationBody.min,
      FIELD_LIMITS.notificationBody.max,
      `Your order ${orderNumber} has been confirmed at Hello Shoes Raipur.`
    );

    batch.set(notifRef, {
      orderId,
      orderNumber,
      userId: user.uid,
      recipientName: safeCustomerName,
      subject: emailSubject,
      bodyPreview: emailBody,
      eventType: 'order_confirmed',
      deliveryStatus: 'sent',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
      setCart([]);
      showToast(
        `Email Dispatched: ${emailSubject}`,
        `Sent to ${payload.email} from ${STORE_INFO.email}`,
        'View Email',
        () => setActiveView('notifications')
      );
      return { orderId, orderNumber };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  // Load Order Items Subcollection on Demand
  const handleLoadOrderItems = async (orderId: string) => {
    if (!user) return;
    const path = `orders/${orderId}/items`;
    try {
      const q = query(
        collection(db, 'orders', orderId, 'items'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const loaded: FirestoreOrderItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FirestoreOrderItem, 'id'>),
      }));
      setOrderItemsMap((prev) => ({ ...prev, [orderId]: loaded }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  };

  // Advance Order Fulfillment Stage + Dispatch Automated Email Notification
  const handleAdvanceOrderStatus = async (order: FirestoreOrder) => {
    if (!user) return;
    const nextMap: Record<
      string,
      {
        status: FirestoreOrder['status'];
        eventType: FirestoreEmailNotification['eventType'];
        subject: string;
        body: string;
      }
    > = {
      confirmed: {
        status: 'crafting_inspection',
        eventType: 'status_update',
        subject: `Atelier Quality Inspection Complete (${order.orderNumber})`,
        body: `Great news! Our cobblers at Hello Shoes, Jagannath Chowk, Kota, Raipur have completed sole alignment, stitching verification, and conditioning for your ${order.primaryProductTitle}. Your pair is now being packed for courier handoff.`,
      },
      crafting_inspection: {
        status: 'out_for_delivery',
        eventType: 'delivery_dispatched',
        subject: `Out for Delivery from Kota, Raipur (${order.orderNumber})`,
        body: `Your order ${order.orderNumber} (${order.primaryProductTitle}) has departed our Jagannath Chowk, Kota atelier with our Raipur priority courier partner toward ${order.deliveryArea}. For delivery assistance call +91 74704 05204.`,
      },
      out_for_delivery: {
        status: 'delivered',
        eventType: 'order_delivered',
        subject: `Order Delivered (${order.orderNumber}) — Enjoy Your Stride`,
        body: `Your Hello Shoes Raipur order ${order.orderNumber} has been delivered to ${order.deliveryArea}. Your 7-day size exchange warranty at Jagannath Chowk, Kota is now active. Share a review in our Customer Review gallery!`,
      },
    };

    const nextStep = nextMap[order.status];
    if (!nextStep) return;

    const orderRef = doc(db, 'orders', order.id);
    const notifId = `eml_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const notifRef = doc(db, 'notifications', notifId);

    const newPaymentStatus =
      nextStep.status === 'delivered' && order.paymentStatus === 'cod_pending'
        ? 'paid'
        : order.paymentStatus;

    try {
      const batch = writeBatch(db);
      batch.update(orderRef, {
        status: nextStep.status,
        paymentStatus: newPaymentStatus,
        updatedAt: serverTimestamp(),
      });

      batch.set(notifRef, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: user.uid,
        recipientName: order.customerName,
        subject: sanitizeString(
          nextStep.subject,
          FIELD_LIMITS.notificationSubject.min,
          FIELD_LIMITS.notificationSubject.max,
          `Order Update (${order.orderNumber})`
        ),
        bodyPreview: sanitizeString(
          nextStep.body,
          FIELD_LIMITS.notificationBody.min,
          FIELD_LIMITS.notificationBody.max,
          `Your order ${order.orderNumber} status has been updated.`
        ),
        eventType: nextStep.eventType,
        deliveryStatus: 'sent',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      showToast(
        `Email Notification Sent: ${nextStep.subject}`,
        'Order tracking status and email log updated in real time.',
        'Open Inbox',
        () => setActiveView('notifications')
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  // Cancel Order + Dispatch Cancellation Email Notification
  const handleCancelOrder = async (order: FirestoreOrder) => {
    if (!user) return;
    const orderRef = doc(db, 'orders', order.id);
    const notifId = `eml_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const notifRef = doc(db, 'notifications', notifId);

    const newPaymentStatus =
      order.paymentStatus === 'paid' ? 'refunded' : order.paymentStatus;
    const subject = `Order Cancelled (${order.orderNumber}) — Hello Shoes Raipur`;
    const body = `Your order ${order.orderNumber} (${order.primaryProductTitle}) has been cancelled as requested prior to dispatch from Jagannath Chowk, Kota, Raipur. ${
      newPaymentStatus === 'refunded'
        ? 'A full refund has been initiated to your original payment source.'
        : 'No payment was collected for this COD order.'
    }`;

    try {
      const batch = writeBatch(db);
      batch.update(orderRef, {
        status: 'cancelled',
        paymentStatus: newPaymentStatus,
        updatedAt: serverTimestamp(),
      });
      batch.set(notifRef, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: user.uid,
        recipientName: order.customerName,
        subject,
        bodyPreview: body,
        eventType: 'order_cancelled',
        deliveryStatus: 'sent',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      showToast(
        `Order ${order.orderNumber} Cancelled`,
        'Cancellation confirmation email dispatched to your inbox.',
        'View Email',
        () => setActiveView('notifications')
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    }
  };

  // Mark Email Notification as Read
  const handleMarkNotificationRead = async (notif: FirestoreEmailNotification) => {
    if (!user || notif.deliveryStatus === 'read') return;
    const notifRef = doc(db, 'notifications', notif.id);
    try {
      await updateDoc(notifRef, {
        deliveryStatus: 'read',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notif.id}`);
    }
  };

  // Submit Customer Review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);

    if (!user) {
      setReviewError('Please sign in with Google to publish a verified customer review.');
      return;
    }

    const product = SHOE_CATALOG.find((p) => p.id === reviewProductId) || SHOE_CATALOG[0];
    const trimmedTitle = reviewTitle.trim();
    const trimmedComment = reviewComment.trim();

    if (
      trimmedTitle.length < FIELD_LIMITS.reviewTitle.min ||
      trimmedTitle.length > FIELD_LIMITS.reviewTitle.max
    ) {
      setReviewError('Review headline must be between 3 and 100 characters.');
      return;
    }
    if (
      trimmedComment.length < FIELD_LIMITS.reviewComment.min ||
      trimmedComment.length > FIELD_LIMITS.reviewComment.max
    ) {
      setReviewError('Review commentary must be between 10 and 600 characters.');
      return;
    }

    setIsSubmittingReview(true);
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const safeAuthorName = sanitizeString(
        user.displayName || 'Verified Raipur Buyer',
        FIELD_LIMITS.userDisplayName.min,
        FIELD_LIMITS.userDisplayName.max,
        'Verified Raipur Buyer'
      );

      if (!userSnap.exists()) {
        batch.set(userRef, {
          uid: user.uid,
          displayName: safeAuthorName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      const reviewRef = doc(db, 'reviews', reviewId);
      batch.set(reviewRef, {
        productId: product.id,
        productName: sanitizeString(product.name, 2, 120, 'Hello Shoes Pair'),
        userId: user.uid,
        authorName: safeAuthorName,
        rating: Math.min(5, Math.max(1, Math.round(reviewRating))),
        title: trimmedTitle,
        comment: trimmedComment,
        sizePurchased: VALIDATION_PATTERNS.UK_SIZE.test(reviewSize) ? reviewSize : 'UK 8',
        status: 'published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      setReviewTitle('');
      setReviewComment('');
      setIsReviewModalOpen(false);
      showToast(
        'Verified Review Published',
        `Thank you for reviewing the ${product.name}.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `reviews/${reviewId}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteOwnReview = async (reviewId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      showToast('Review Removed', 'Your customer review has been deleted.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviews/${reviewId}`);
    }
  };

  const handleQuickShareProduct = async (product: ShoeProduct) => {
    const shareUrl = `${window.location.origin}/?product=${encodeURIComponent(product.id)}`;
    const shareText = `${product.name} (₹${product.price.toLocaleString('en-IN')}) at Hello Shoes, Jagannath Chowk, Kota, Raipur — ${shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} — Hello Shoes Raipur`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      showToast(
        'Share Link Copied to Clipboard',
        `${product.name} link ready for WhatsApp, Instagram, or X.`
      );
    } catch {
      showToast('Product Share Ready', shareText);
    }
  };

  const totalBagCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const unreadEmailCount = notifications.filter((n) => n.deliveryStatus === 'sent').length;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F8F7F4] text-stone-900">
      {/* =====================================================================
          STRICT 3-ZONE TOP BAR CONTRACT (Single Row, Clean Wordmark, 5 Links, 2 Actions)
          ===================================================================== */}
      <header className="sticky top-0 z-40 bg-[#F8F7F4]/95 backdrop-blur-xs border-b border-stone-200 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('storefront');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xl font-extrabold tracking-tight text-stone-900 font-display whitespace-nowrap shrink-0"
          >
            Hello Shoes
          </a>

          {/* Zone 2: 5 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
            <button
              type="button"
              onClick={() => {
                setActiveView('storefront');
                setTimeout(() => {
                  document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className={`hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'storefront' ? 'text-stone-900 font-semibold' : ''
              }`}
            >
              Collection
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('storefront');
                setTimeout(() => {
                  document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Reviews
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('orders');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'orders' ? 'text-amber-800 font-semibold underline' : ''
              }`}
            >
              Order Tracking {orders.length > 0 ? `(${orders.length})` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('notifications');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'notifications' ? 'text-amber-800 font-semibold underline' : ''
              }`}
            >
              Email Updates {unreadEmailCount > 0 ? `(${unreadEmailCount} new)` : ''}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('storefront');
                setTimeout(() => {
                  document.getElementById('atelier')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="hover:text-stone-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Raipur Atelier
            </button>
          </nav>

          {/* Zone 3: 1-2 Primary Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-stone-900 bg-[#EFECE6] hover:bg-stone-300 transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-800" />
              <span className="font-mono-tabular">Bag ({totalBagCount})</span>
            </button>

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveView('orders')}
                  className="px-3.5 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-300 hover:border-stone-900 transition-colors whitespace-nowrap max-w-[150px] truncate"
                  title={user.displayName || user.email || 'Account'}
                >
                  {user.displayName?.split(' ')[0] || 'Account'}
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="p-2 text-stone-500 hover:text-stone-900 border border-stone-300 bg-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0"
              >
                Member Sign In
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 text-stone-700 hover:text-stone-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 mt-3 border-t border-stone-200 flex flex-col gap-2 text-sm font-medium text-stone-700">
            <button
              type="button"
              onClick={() => {
                setActiveView('storefront');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 hover:text-stone-900"
            >
              Footwear Collection
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('orders');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 hover:text-stone-900"
            >
              Order Tracking Dashboard ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('notifications');
                setMobileMenuOpen(false);
              }}
              className="text-left py-2 hover:text-stone-900"
            >
              Email Notification Center ({unreadEmailCount} unread)
            </button>
            {user && (
              <button
                type="button"
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
                className="text-left py-2 text-red-800"
              >
                Sign Out ({user.displayName || user.email})
              </button>
            )}
          </div>
        )}
      </header>

      {/* Optional Auth Error Banner */}
      {authErrorBanner && (
        <div className="bg-amber-100 border-b border-amber-300 px-6 py-2.5 text-xs text-amber-950 flex items-center justify-between">
          <span>{authErrorBanner}</span>
          <button
            type="button"
            onClick={() => setAuthErrorBanner(null)}
            className="font-semibold underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Live Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 max-w-md bg-stone-900 text-white p-4 shadow-2xl border border-stone-700 flex items-start justify-between gap-4"
        >
          <div>
            <p className="text-xs font-semibold text-white">{toastMessage.title}</p>
            {toastMessage.subtitle && (
              <p className="text-xs text-stone-300 mt-1">{toastMessage.subtitle}</p>
            )}
            {toastMessage.actionLabel && toastMessage.onAction && (
              <button
                type="button"
                onClick={() => {
                  toastMessage.onAction?.();
                  setToastMessage(null);
                }}
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:underline"
              >
                {toastMessage.actionLabel}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
            className="text-stone-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          MAIN VIEW ROUTER
          ===================================================================== */}
      <main className="flex-1">
        {activeView === 'orders' ? (
          <OrderTrackingDashboard
            user={user}
            orders={orders}
            orderItemsMap={orderItemsMap}
            initialSearchQuery={trackedOrderSearchCode}
            onSignInRequest={handleGoogleSignIn}
            onAdvanceOrderStatus={handleAdvanceOrderStatus}
            onCancelOrder={handleCancelOrder}
            onLoadOrderItems={handleLoadOrderItems}
            onOpenNotifications={() => setActiveView('notifications')}
          />
        ) : activeView === 'notifications' ? (
          <EmailNotificationCenter
            user={user}
            notifications={notifications}
            onSignInRequest={handleGoogleSignIn}
            onMarkAsRead={handleMarkNotificationRead}
            onNavigateToOrder={(orderNumber) => {
              setTrackedOrderSearchCode(orderNumber);
              setActiveView('orders');
            }}
          />
        ) : (
          /* ===================================================================
             STOREFRONT VIEW (Strictly 3 Content Sections + Footer)
             1. Storefront Hero
             2. Featured Collection Grid with Search & Filter
             3. Customer Reviews & Raipur Atelier Story
             =================================================================== */
          <>
            {/* SECTION 1: Storefront Hero */}
            <section className="border-b border-stone-200 bg-[#EFECE6]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                  {/* Left Editorial Column */}
                  <div className="lg:col-span-6 space-y-6">
                    {/* Regional Trust Kicker (Unboxed clean metadata) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600">
                      <span className="font-semibold text-amber-900">
                        {STORE_INFO.addressLine}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">Direct: {STORE_INFO.phoneDisplay}</span>
                      <span aria-hidden="true">·</span>
                      <span>Same-Day Raipur Dispatch</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight leading-[1.12]">
                      Architectural Footwear Crafted for Raipur Streets.
                    </h1>

                    <p className="text-base text-stone-600 leading-relaxed max-w-[62ch]">
                      From Blake-stitched vegetable-tanned loafers to carbon-plated road runners, every pair at{' '}
                      <strong className="text-stone-900">Hello Shoes, Jagannath Chowk, Kota</strong> is last-inspected by hand before doorstep delivery across Chhattisgarh.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <a
                        href="#collection"
                        className="inline-flex items-center gap-2 px-6 py-3.5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors whitespace-nowrap"
                      >
                        Shop Footwear Collection
                        <ArrowRight className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => setActiveView('orders')}
                        className="inline-flex items-center gap-2 px-5 py-3.5 text-xs font-semibold text-stone-900 bg-white border border-stone-300 hover:border-stone-900 transition-colors whitespace-nowrap"
                      >
                        <Package className="w-4 h-4 text-amber-800" />
                        Track Your Order
                      </button>
                    </div>

                    {/* Quantitative Proof Adjacency */}
                    <div className="pt-6 border-t border-stone-300/80 grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-xl font-bold font-mono-tabular text-stone-900">
                          4.9 / 5.0
                        </p>
                        <p className="text-xs text-stone-600 mt-0.5">
                          Across 169+ verified Raipur buyers in 2026
                        </p>
                      </div>
                      <div>
                        <p className="text-xl font-bold font-mono-tabular text-stone-900">
                          &lt; 3 Hours
                        </p>
                        <p className="text-xs text-stone-600 mt-0.5">
                          Express courier from Kota across Raipur city
                        </p>
                      </div>
                      <div>
                        <p className="text-xl font-bold font-mono-tabular text-stone-900">
                          7 Days
                        </p>
                        <p className="text-xs text-stone-600 mt-0.5">
                          Complimentary doorstep size exchange
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right 16:9 Studio Campaign Showcase */}
                  <div className="lg:col-span-6">
                    <div className="relative aspect-16/9 w-full bg-[#E5E0D5] border border-stone-300 overflow-hidden shadow-lg">
                      <ProductImage
                        src={HERO_BANNER_IMAGE}
                        alt="Hello Shoes Raipur Flagship Footwear Showcase on Travertine Plinth"
                        categoryLabel="Autumn / Monsoon 2026 Rotation"
                        className="w-full h-full"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 flex items-end justify-between text-white">
                        <div>
                          <p className="text-xs text-stone-300">
                            Flagship Rotation · Available at Jagannath Chowk, Kota
                          </p>
                          <p className="text-sm font-semibold mt-0.5">
                            Sovereign Chestnut Derby &amp; Sand Architectural Runner
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveProductModal(SHOE_CATALOG[5])}
                          className="px-3.5 py-2 text-xs font-semibold bg-white text-stone-900 hover:bg-stone-100 transition-colors whitespace-nowrap shrink-0"
                        >
                          Inspect Pair
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 2: Featured Footwear Collection & Search Filter Bar */}
            <section
              id="collection"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-stone-200">
                <div>
                  <p className="text-xs text-stone-500">
                    01. Curated Footwear Catalog · Direct from Kota Atelier
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 tracking-tight">
                    Signature Footwear Collection
                  </h2>
                </div>

                {/* Live Search Input */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search model, leather, suede, runner..."
                    aria-label="Search footwear catalog"
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-stone-300 focus:outline-none focus:border-stone-900"
                  />
                </div>
              </div>

              {/* Interactive Filter Controls (Category Tabs + UK Size Filter + Sort) */}
              <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
                {/* Category Segmented Controls */}
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#EFECE6] border border-stone-200">
                  {[
                    'All Footwear',
                    'Performance Runners',
                    'Artisanal Leather',
                    'Court & Street',
                    'All-Weather Trail',
                  ].map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                        selectedCategory === category
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Size & Sort Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
                    <label htmlFor="size-filter" className="text-stone-600 font-medium">
                      Size:
                    </label>
                    <select
                      id="size-filter"
                      value={selectedSizeFilter}
                      onChange={(e) => setSelectedSizeFilter(e.target.value)}
                      className="px-3 py-2 text-xs font-mono-tabular bg-white border border-stone-300 text-stone-900 focus:outline-none focus:border-stone-900"
                    >
                      {[
                        'All Sizes',
                        'UK 6',
                        'UK 7',
                        'UK 8',
                        'UK 9',
                        'UK 10',
                        'UK 11',
                      ].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <label htmlFor="sort-select" className="text-stone-600 font-medium">
                      Sort:
                    </label>
                    <select
                      id="sort-select"
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as
                            | 'featured'
                            | 'price-asc'
                            | 'price-desc'
                            | 'rating'
                        )
                      }
                      className="px-3 py-2 text-xs bg-white border border-stone-300 text-stone-900 focus:outline-none focus:border-stone-900"
                    >
                      <option value="featured">Atelier Featured</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="rating">Highest Customer Rating</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3-Column Product Gallery Grid */}
              {filteredProducts.length === 0 ? (
                <div className="mt-12 bg-white border border-stone-200 p-12 text-center">
                  <p className="text-base font-semibold text-stone-900">
                    No footwear models match your current filter
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Try clearing your search term or selecting "All Footwear" and "All Sizes".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All Footwear');
                      setSelectedSizeFilter('All Sizes');
                    }}
                    className="mt-5 px-5 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors whitespace-nowrap"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredProducts.map((product) => {
                    const selectedSize =
                      cardSelectedSizes[product.id] || product.sizes[0];
                    const productLiveReviews = reviews.filter(
                      (r) => r.productId === product.id
                    );
                    const displayRating =
                      productLiveReviews.length > 0
                        ? (
                            productLiveReviews.reduce((s, r) => s + r.rating, 0) /
                            productLiveReviews.length
                          ).toFixed(1)
                        : product.defaultRating.toFixed(1);

                    return (
                      <article
                        key={product.id}
                        className="group bg-white border border-stone-200 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div>
                          {/* Lead with Imagery (4:3 on solid neutral backdrop) */}
                          <div
                            onClick={() => setActiveProductModal(product)}
                            className="aspect-4/3 w-full bg-[#EFECE6] overflow-hidden cursor-pointer border-b border-stone-200"
                          >
                            <ProductImage
                              src={product.imageUrl}
                              alt={product.name}
                              categoryLabel={product.category}
                              className="w-full h-full transition-transform duration-200 group-hover:scale-[1.02]"
                            />
                          </div>

                          {/* Card Body — Clean Unboxed Metadata */}
                          <div className="p-6">
                            <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="uppercase tracking-wider">
                                  {product.category}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{product.stockStatus}</span>
                              </div>
                              <span className="font-mono-tabular font-medium text-stone-800 shrink-0">
                                {displayRating} ★
                              </span>
                            </div>

                            <div className="mt-2 flex items-baseline justify-between gap-3">
                              <h3
                                onClick={() => setActiveProductModal(product)}
                                className="text-base font-semibold text-stone-900 hover:text-amber-800 cursor-pointer transition-colors"
                              >
                                {product.name}
                              </h3>
                              <span className="text-[15px] font-mono-tabular font-semibold text-stone-900 shrink-0">
                                ₹{product.price.toLocaleString('en-IN')}
                              </span>
                            </div>

                            <p className="text-xs text-stone-500 mt-1">
                              {product.material} · {product.colorways[0]}
                            </p>

                            {/* Quick UK Size Selector */}
                            <div className="mt-4 pt-4 border-t border-stone-100">
                              <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                                <span>Quick Select Size (UK)</span>
                                <button
                                  type="button"
                                  onClick={() => setActiveProductModal(product)}
                                  className="text-amber-800 hover:underline font-medium"
                                >
                                  Details &amp; Fit Guide
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {product.sizes.map((sz) => (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() =>
                                      setCardSelectedSizes((prev) => ({
                                        ...prev,
                                        [product.id]: sz,
                                      }))
                                    }
                                    className={`px-2.5 py-1 text-xs font-mono-tabular transition-colors whitespace-nowrap ${
                                      selectedSize === sz
                                        ? 'bg-stone-900 text-white font-semibold'
                                        : 'bg-[#F8F7F4] text-stone-700 hover:bg-stone-200'
                                    }`}
                                  >
                                    {sz}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="px-6 pb-6 pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleAddToCart(
                                product,
                                selectedSize,
                                product.colorways[0],
                                1
                              )
                            }
                            className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors whitespace-nowrap"
                          >
                            Add to Bag · {selectedSize}
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveProductModal(product)}
                            className="py-2.5 px-3.5 text-xs font-medium text-stone-800 bg-[#EFECE6] hover:bg-stone-300 transition-colors whitespace-nowrap"
                          >
                            Inspect
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickShareProduct(product)}
                            aria-label={`Share ${product.name}`}
                            title="Share footwear link"
                            className="p-2.5 text-stone-600 bg-[#F8F7F4] border border-stone-200 hover:border-stone-900 hover:text-stone-900 transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECTION 3: Customer Review Section & Kota Raipur Atelier Story */}
            <section
              id="reviews"
              className="border-t border-stone-200 bg-[#EFECE6]/70 py-16 lg:py-20"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-stone-300">
                  <div>
                    <p className="text-xs text-stone-500">
                      02. Verified Wear Reports · Raipur &amp; Chhattisgarh Buyers
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 tracking-tight">
                      Customer Fit &amp; Durability Reviews
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 transition-colors whitespace-nowrap self-start md:self-auto"
                  >
                    <MessageSquarePlus className="w-4 h-4 text-amber-400" />
                    Write a Verified Review
                  </button>
                </div>

                {/* Live Firestore Reviews + Curated Attributable Raipur Testimonials */}
                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {reviews.map((rev) => {
                    const isOwner = user && user.uid === rev.userId;
                    const dateStr = rev.createdAt?.toDate
                      ? rev.createdAt.toDate().toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Verified Buyer';

                    return (
                      <div
                        key={rev.id}
                        className="bg-white border border-stone-200 p-6 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-stone-500">
                            <span className="font-mono-tabular font-semibold text-amber-800">
                              {'★'.repeat(rev.rating)}{' '}
                              <span className="text-stone-900">{rev.rating}.0</span>
                            </span>
                            <span>
                              {rev.sizePurchased} · {dateStr}
                            </span>
                          </div>

                          <p className="text-xs text-stone-500 mt-2">
                            Model: <strong className="text-stone-800">{rev.productName}</strong>
                          </p>

                          <h3 className="text-base font-bold text-stone-900 mt-2">
                            {rev.title}
                          </h3>

                          <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                            “{rev.comment}”
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-stone-900">{rev.authorName}</p>
                            <p className="text-stone-500">
                              Verified Online Member · Hello Shoes Raipur
                            </p>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleDeleteOwnReview(rev.id)}
                              title="Delete your review"
                              className="p-1.5 text-stone-400 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {CURATED_TESTIMONIALS.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-stone-200 p-6 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-stone-500">
                          <span className="font-mono-tabular font-semibold text-amber-800">
                            ★★★★★ <span className="text-stone-900">5.0</span>
                          </span>
                          <span>
                            {item.sizePurchased} · {item.dateLabel}
                          </span>
                        </div>

                        <p className="text-xs text-stone-500 mt-2">
                          Model: <strong className="text-stone-800">{item.productName}</strong>
                        </p>

                        <h3 className="text-base font-bold text-stone-900 mt-2">
                          {item.title}
                        </h3>

                        <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                          “{item.comment}”
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-stone-100 text-xs">
                        <p className="font-semibold text-stone-900">{item.authorName}</p>
                        <p className="text-stone-500">
                          {item.role} · {item.organization}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kota Raipur Atelier Flagship Location Block */}
                <div
                  id="atelier"
                  className="mt-16 bg-white border border-stone-200 p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
                >
                  <div className="lg:col-span-7 space-y-4">
                    <p className="text-xs text-stone-500">
                      03. Flagship Storefront &amp; Fitting Room
                    </p>
                    <h3 className="text-2xl font-bold text-stone-900">
                      Visit Hello Shoes at Jagannath Chowk, Kota, Raipur
                    </h3>
                    <p className="text-sm text-stone-600 leading-relaxed max-w-2xl">
                      Experience our full-grain calfskin loafers, weatherproof suede Chelsea boots, and carbon road runners in person. Walk-in foot last measurement, bespoke leather conditioning, and instant store pickup are available daily.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-stone-700">
                      <div className="p-4 bg-[#F8F7F4] border border-stone-200">
                        <p className="font-semibold text-stone-900 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-amber-800" />
                          Store Address
                        </p>
                        <p className="mt-1">Hello Shoes, {STORE_INFO.addressLine}</p>
                        <p>{STORE_INFO.cityStatePin}</p>
                      </div>
                      <div className="p-4 bg-[#F8F7F4] border border-stone-200">
                        <p className="font-semibold text-stone-900 flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-amber-800" />
                          Direct Store Helpline &amp; Hours
                        </p>
                        <p className="mt-1 font-mono-tabular font-semibold text-stone-900">
                          {STORE_INFO.phoneDisplay}
                        </p>
                        <p>{STORE_INFO.hours}</p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-[#F8F7F4] border border-stone-200 p-6 space-y-4">
                    <h4 className="text-sm font-bold text-stone-900">
                      Instant WhatsApp Concierge &amp; Order Support
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Need custom UK half-size fitting advice or same-day courier coordination in Raipur? Connect directly with our Jagannath Chowk desk.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <a
                        href={`https://wa.me/91${STORE_INFO.phoneRaw}?text=${encodeURIComponent(
                          'Hello! I am browsing the Hello Shoes Raipur online storefront and would like assistance with footwear sizing.'
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 px-4 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 text-center transition-colors whitespace-nowrap"
                      >
                        WhatsApp Store (+91 74704 05204)
                      </a>
                      <a
                        href={`tel:+91${STORE_INFO.phoneRaw}`}
                        className="py-3 px-4 text-xs font-semibold text-stone-900 bg-white border border-stone-300 hover:border-stone-900 text-center transition-colors whitespace-nowrap"
                      >
                        Call Store Desk
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* =====================================================================
          MODAL: WRITE A VERIFIED CUSTOMER REVIEW
          ===================================================================== */}
      {isReviewModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
        >
          <div className="w-full max-w-lg bg-white border border-stone-300 shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <h2 id="review-modal-title" className="text-lg font-bold text-stone-900">
                Submit a Verified Footwear Review
              </h2>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1.5 text-stone-500 hover:text-stone-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!user ? (
              <div className="py-6 space-y-4">
                <p className="text-sm text-stone-600">
                  To keep our customer reviews authentic and prevent automated spam, please sign in with your verified Google account.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors whitespace-nowrap"
                >
                  Sign In with Google
                </button>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
                {reviewError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">
                    {reviewError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Select Footwear Model *
                  </label>
                  <select
                    value={reviewProductId}
                    onChange={(e) => setReviewProductId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-stone-300"
                  >
                    {SHOE_CATALOG.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Rating (1 to 5 Stars) *
                    </label>
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F7F4] border border-stone-300"
                    >
                      <option value={5}>5 ★ — Exceptional Fit</option>
                      <option value={4}>4 ★ — Very Good</option>
                      <option value={3}>3 ★ — Satisfactory</option>
                      <option value={2}>2 ★ — Subpar</option>
                      <option value={1}>1 ★ — Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      UK Size Purchased *
                    </label>
                    <select
                      value={reviewSize}
                      onChange={(e) => setReviewSize(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-tabular bg-[#F8F7F4] border border-stone-300"
                    >
                      {['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'].map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Review Headline * (3–100 chars)
                  </label>
                  <input
                    type="text"
                    required
                    minLength={FIELD_LIMITS.reviewTitle.min}
                    maxLength={FIELD_LIMITS.reviewTitle.max}
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="e.g. Zero break-in time and plush arch support"
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Detailed Fit &amp; Wear Experience * (10–600 chars)
                  </label>
                  <textarea
                    rows={4}
                    required
                    minLength={FIELD_LIMITS.reviewComment.min}
                    maxLength={FIELD_LIMITS.reviewComment.max}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share how this pair fits, how it performs on Raipur roads, and your experience with Hello Shoes..."
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F4] border border-stone-300"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-medium text-stone-700 bg-[#EFECE6] hover:bg-stone-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-50"
                  >
                    {isSubmittingReview ? 'Publishing...' : 'Publish Verified Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONTIGUOUS PRODUCT DETAIL & SOCIAL SHARING
          ===================================================================== */}
      <ProductDetailModal
        product={activeProductModal}
        onClose={() => setActiveProductModal(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        reviews={reviews}
        onOpenReviewForm={(product) => {
          setReviewProductId(product.id);
          setIsReviewModalOpen(true);
        }}
      />

      {/* =====================================================================
          SLIDE-OVER: SHOPPING BAG & SECURE CHECKOUT
          ===================================================================== */}
      <CartCheckoutDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        user={user}
        savedContact={savedContact}
        onSignInRequest={handleGoogleSignIn}
        onSubmitOrder={handleCheckoutSubmit}
        onNavigateToOrder={(orderNumber) => {
          setTrackedOrderSearchCode(orderNumber);
          setActiveView('orders');
        }}
      />

      {/* =====================================================================
          ARCHITECTURAL FOOTER (Quiet Copyright, Store Address, Real Actions)
          ===================================================================== */}
      <footer className="bg-stone-950 text-stone-300 border-t border-stone-800 py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
          <div className="md:col-span-2 space-y-3">
            <p className="text-lg font-bold text-white font-display tracking-tight">
              Hello Shoes Raipur
            </p>
            <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
              Handcrafted leather footwear, court silhouettes, and carbon road runners. Inspected and dispatched daily from our flagship store at Jagannath Chowk, Kota, Raipur.
            </p>
            <p className="text-xs text-stone-300 font-mono-tabular pt-1">
              📍 {STORE_INFO.addressLine}, {STORE_INFO.cityStatePin} · 📲 {STORE_INFO.phoneDisplay}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-semibold text-white">Storefront Navigation</p>
            <ul className="space-y-1.5 text-stone-400">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('storefront')}
                  className="hover:text-white transition-colors"
                >
                  Footwear Collection
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('orders')}
                  className="hover:text-white transition-colors"
                >
                  Order Tracking Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveView('notifications')}
                  className="hover:text-white transition-colors"
                >
                  Transactional Email Updates
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="hover:text-white transition-colors"
                >
                  Submit a Customer Review
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2 text-xs">
            <p className="font-semibold text-white">Atelier Hours &amp; Support</p>
            <p className="text-stone-400">{STORE_INFO.hours}</p>
            <p className="text-stone-400">Email: {STORE_INFO.email}</p>
            <p className="text-stone-400 font-mono-tabular">
              Helpline: {STORE_INFO.phoneDisplay}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Hello Shoes, Jagannath Chowk, Kota, Raipur. All rights reserved.</p>
          <p>Free Express Delivery in Raipur on orders above ₹2,999 · 7-Day Size Exchange</p>
        </div>
      </footer>
    </div>
  );
}
