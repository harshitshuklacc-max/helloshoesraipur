# Hello Shoes Raipur — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants & Master Sources of Truth

1. **Global Default-Deny**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity Gate**: Every write operation across all collections requires `request.auth != null && request.auth.token.email_verified == true`.
3. **Admin Verification**: Admin privileges are never trusted from custom client claims. `isAdmin()` requires either an existing `/admins/$(request.auth.uid)` document or verified runtime owner email (`harshitshuklacc@gmail.com` with `request.auth.token.email_verified == true`).
4. **PII Split-Collection Isolation**: Customer PII (`email`, `phone`, `streetAddress`, `landmark`, `city`, `postalCode`) is strictly isolated inside `/users/{userId}/private/{docId}`, gated by Master Gate `exists(/databases/$(database)/documents/users/$(userId))` and accessible only to `request.auth.uid == userId || isAdmin()`.
5. **Relational Master Gate for Order Line Items**: An `/orders/{orderId}/items/{itemId}` document can only be created or read if the parent `/orders/{orderId}` exists and `get(/databases/$(database)/documents/orders/$(orderId)).data.userId == request.auth.uid` (or `isAdmin()`).
6. **Global Consistency Invariant for Email Notifications**: Creating `/notifications/{notificationId}` requires `exists(/databases/$(database)/documents/orders/$(incoming().orderId))` and verifying that the parent order belongs to `request.auth.uid` (or `isAdmin()`).
7. **Terminal State Locking**: Once an `/orders/{orderId}` document reaches terminal status (`delivered` or `cancelled`), non-admin users are strictly blocked from performing any subsequent updates.
8. **Temporal & Ownership Immutability**: `createdAt`, `userId`, `uid`, `orderId`, `orderNumber`, and `productId` are immutable on all updates (`incoming().field == existing().field`), and timestamps must equal `request.time`.
9. **Secure List Queries**: No blanket `allow list: if isSignedIn();` is permitted. Every `allow list` rule evaluates `existing()` (`resource.data`) without expensive `get()`/`exists()` calls.

---

## 2. The "Dirty Dozen" Adversarial Payloads

### Payload 1: Unverified Email Spoof Attack on Admin Gate
```json
{
  "auth": { "uid": "attacker_1", "token": { "email": "harshitshuklacc@gmail.com", "email_verified": false } },
  "operation": "update",
  "path": "/orders/order_101",
  "data": { "status": "delivered" }
}
```

### Payload 2: Shadow Field Injection ("Ghost Field") on Order Creation
```json
{
  "auth": { "uid": "user_1", "token": { "email": "user1@example.com", "email_verified": true } },
  "operation": "create",
  "path": "/orders/order_102",
  "data": {
    "orderNumber": "HS-1002",
    "userId": "user_1",
    "customerName": "Aarav Sharma",
    "deliveryArea": "Kota, Raipur",
    "paymentMethod": "upi",
    "paymentStatus": "paid",
    "status": "confirmed",
    "subtotal": 4999,
    "shippingFee": 0,
    "totalAmount": 4999,
    "itemCount": 1,
    "primaryProductTitle": "Velocity Carbon Runner",
    "isVerifiedAdminOrder": true,
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 3: Identity Spoofing on Review Creation (`userId` Mismatch)
```json
{
  "auth": { "uid": "user_1", "token": { "email": "user1@example.com", "email_verified": true } },
  "operation": "create",
  "path": "/reviews/rev_1",
  "data": {
    "productId": "shoe-velocity-runner",
    "productName": "Velocity Carbon Runner",
    "userId": "victim_user_2",
    "authorName": "Victim Name",
    "rating": 1,
    "title": "Fake review",
    "comment": "Spoofing another customer identity in review submission.",
    "sizePurchased": "UK 9",
    "status": "published",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 4: Cross-User PII Blanket Read Attack
```json
{
  "auth": { "uid": "attacker_2", "token": { "email": "attacker@example.com", "email_verified": true } },
  "operation": "get",
  "path": "/users/victim_user_1/private/contact"
}
```

### Payload 5: Orphaned Subcollection Write on `/orders/{orderId}/items/{itemId}`
```json
{
  "auth": { "uid": "user_1", "token": { "email": "user1@example.com", "email_verified": true } },
  "operation": "create",
  "path": "/orders/non_existent_order_999/items/item_1",
  "data": {
    "orderId": "non_existent_order_999",
    "userId": "user_1",
    "productId": "shoe-velocity-runner",
    "productName": "Velocity Carbon Runner",
    "size": "UK 8",
    "colorway": "Obsidian / Bone",
    "unitPrice": 4999,
    "quantity": 1,
    "createdAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 6: Terminal State Bypass (Updating a `delivered` Order)
```json
{
  "auth": { "uid": "user_1", "token": { "email": "user1@example.com", "email_verified": true } },
  "operation": "update",
  "path": "/orders/delivered_order_1",
  "existingData": { "userId": "user_1", "status": "delivered" },
  "data": { "status": "cancelled", "updatedAt": "SERVER_TIMESTAMP" }
}
```

### Payload 7: State Shortcutting / Price Tampering During Order Update
```json
{
  "auth": { "uid": "user_1", "token": { "email": "user1@example.com", "email_verified": true } },
  "operation": "update",
  "path": "/orders/active_order_1",
  "existingData": { "userId": "user_1", "status": "confirmed", "totalAmount": 6499 },
  "data": { "totalAmount": 1, "updatedAt": "SERVER_TIMESTAMP" }
}
```

### Payload 8: ID Poisoning / Resource Exhaustion Attack on Document Path
```json
{
  "auth": { "uid": "user_1", "token": { "email": "user1@example.com", "email_verified": true } },
  "operation": "create",
  "path": "/reviews/invalid$id#with!special*chars",
  "data": {}
}
```

### Payload 9: Value Poisoning on Review Rating (`rating: 999`)
```json
{
  "auth": { "uid": "user_1", "token": { "email": "user1@example.com", "email_verified": true } },
  "operation": "create",
  "path": "/reviews/rev_poison",
  "data": {
    "productId": "shoe-velocity-runner",
    "productName": "Velocity Carbon Runner",
    "userId": "user_1",
    "authorName": "Aarav Sharma",
    "rating": 999,
    "title": "Out of bounds rating",
    "comment": "Attempting to skew average rating with 999 stars.",
    "sizePurchased": "UK 9",
    "status": "published",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 10: Temporal Integrity Forgery (Backdated `createdAt` Timestamp)
```json
{
  "auth": { "uid": "user_1", "token": { "email": "user1@example.com", "email_verified": true } },
  "operation": "create",
  "path": "/users/user_1",
  "data": {
    "uid": "user_1",
    "displayName": "Aarav Sharma",
    "createdAt": "2020-01-01T00:00:00Z",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```

### Payload 11: Unconstrained List Scraping on `/orders` Without `userId` Filter
```json
{
  "auth": { "uid": "attacker_1", "token": { "email": "attacker@example.com", "email_verified": true } },
  "operation": "list",
  "path": "/orders"
}
```

### Payload 12: Orphaned Email Notification Injection for Another User's Order
```json
{
  "auth": { "uid": "attacker_1", "token": { "email": "attacker@example.com", "email_verified": true } },
  "operation": "create",
  "path": "/notifications/notif_spoof",
  "data": {
    "orderId": "victim_order_1",
    "orderNumber": "HS-8888",
    "userId": "attacker_1",
    "recipientName": "Attacker",
    "subject": "Order Update",
    "bodyPreview": "Attempting to attach notification to victim order.",
    "eventType": "order_confirmed",
    "deliveryStatus": "sent",
    "createdAt": "SERVER_TIMESTAMP",
    "updatedAt": "SERVER_TIMESTAMP"
  }
}
```
