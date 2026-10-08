/**
 * Phase 0 TDD Security Test Runner for Hello Shoes Raipur Firestore Rules.
 * Verifies that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
  invariantTested: string;
}

export const DIRTY_DOZEN_TEST_SUITE: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Spoof Attack on Admin Gate',
    collectionPath: '/orders/order_101',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'request.auth.token.email_verified == true required for admin email match',
  },
  {
    id: 2,
    name: 'Shadow Field Injection (Ghost Field) on Order Creation',
    collectionPath: '/orders/order_102',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'data.keys().hasOnly(...) blocks undocumented fields',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Review Creation (userId Mismatch)',
    collectionPath: '/reviews/rev_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'incoming().userId == request.auth.uid',
  },
  {
    id: 4,
    name: 'Cross-User PII Blanket Read Attack',
    collectionPath: '/users/victim_user_1/private/contact',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'Split-collection PII strictly isolated to owner or verified admin',
  },
  {
    id: 5,
    name: 'Orphaned Subcollection Write on /orders/{orderId}/items/{itemId}',
    collectionPath: '/orders/non_existent_order_999/items/item_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'Master Gate verifies parent order exists and belongs to user',
  },
  {
    id: 6,
    name: 'Terminal State Bypass (Updating a delivered Order)',
    collectionPath: '/orders/delivered_order_1',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'Terminal state gate blocks non-admin updates once delivered or cancelled',
  },
  {
    id: 7,
    name: 'State Shortcutting / Price Tampering During Order Update',
    collectionPath: '/orders/active_order_1',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'Action-based update affectedKeys().hasOnly(...) blocks price mutation',
  },
  {
    id: 8,
    name: 'ID Poisoning / Resource Exhaustion Attack on Document Path',
    collectionPath: '/reviews/invalid$id#with!special*chars',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'isValidId() enforces ^[a-zA-Z0-9_\\-]+$ and <= 128 chars',
  },
  {
    id: 9,
    name: 'Value Poisoning on Review Rating (rating: 999)',
    collectionPath: '/reviews/rev_poison',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'isValidProductReview() enforces rating is int && rating >= 1 && rating <= 5',
  },
  {
    id: 10,
    name: 'Temporal Integrity Forgery (Backdated createdAt Timestamp)',
    collectionPath: '/users/user_1',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'incoming().createdAt == request.time',
  },
  {
    id: 11,
    name: 'Unconstrained List Scraping on /orders Without userId Filter',
    collectionPath: '/orders',
    operation: 'list',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'allow list evaluates existing().userId == request.auth.uid',
  },
  {
    id: 12,
    name: 'Orphaned Email Notification Injection for Another User Order',
    collectionPath: '/notifications/notif_spoof',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
    invariantTested: 'Global Consistency Invariant verifies parent order exists and is owned by user',
  },
];
