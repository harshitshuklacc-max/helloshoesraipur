import blueprint from '../../firebase-blueprint.json';

/**
 * Verbatim validation constants and regex patterns synced directly from firebase-blueprint.json
 */
export const BLUEPRINT_ENTITIES = blueprint.entities;

export const VALIDATION_PATTERNS = {
  ID: new RegExp(BLUEPRINT_ENTITIES.UserProfile.properties.uid.pattern),
  EMAIL: new RegExp(BLUEPRINT_ENTITIES.UserPrivateContact.properties.email.pattern),
  PHONE: new RegExp(BLUEPRINT_ENTITIES.UserPrivateContact.properties.phone.pattern),
  POSTAL_CODE: new RegExp(BLUEPRINT_ENTITIES.UserPrivateContact.properties.postalCode.pattern),
  ORDER_NUMBER: new RegExp(BLUEPRINT_ENTITIES.Order.properties.orderNumber.pattern),
  UK_SIZE: new RegExp(BLUEPRINT_ENTITIES.OrderItem.properties.size.pattern),
};

export const FIELD_LIMITS = {
  userDisplayName: {
    min: BLUEPRINT_ENTITIES.UserProfile.properties.displayName.minLength,
    max: BLUEPRINT_ENTITIES.UserProfile.properties.displayName.maxLength,
  },
  email: {
    min: BLUEPRINT_ENTITIES.UserPrivateContact.properties.email.minLength,
    max: BLUEPRINT_ENTITIES.UserPrivateContact.properties.email.maxLength,
  },
  phone: {
    min: BLUEPRINT_ENTITIES.UserPrivateContact.properties.phone.minLength,
    max: BLUEPRINT_ENTITIES.UserPrivateContact.properties.phone.maxLength,
  },
  streetAddress: {
    min: BLUEPRINT_ENTITIES.UserPrivateContact.properties.streetAddress.minLength,
    max: BLUEPRINT_ENTITIES.UserPrivateContact.properties.streetAddress.maxLength,
  },
  landmark: {
    min: BLUEPRINT_ENTITIES.UserPrivateContact.properties.landmark.minLength,
    max: BLUEPRINT_ENTITIES.UserPrivateContact.properties.landmark.maxLength,
  },
  city: {
    min: BLUEPRINT_ENTITIES.UserPrivateContact.properties.city.minLength,
    max: BLUEPRINT_ENTITIES.UserPrivateContact.properties.city.maxLength,
  },
  postalCode: {
    min: BLUEPRINT_ENTITIES.UserPrivateContact.properties.postalCode.minLength,
    max: BLUEPRINT_ENTITIES.UserPrivateContact.properties.postalCode.maxLength,
  },
  deliveryArea: {
    min: BLUEPRINT_ENTITIES.Order.properties.deliveryArea.minLength,
    max: BLUEPRINT_ENTITIES.Order.properties.deliveryArea.maxLength,
  },
  reviewTitle: {
    min: BLUEPRINT_ENTITIES.ProductReview.properties.title.minLength,
    max: BLUEPRINT_ENTITIES.ProductReview.properties.title.maxLength,
  },
  reviewComment: {
    min: BLUEPRINT_ENTITIES.ProductReview.properties.comment.minLength,
    max: BLUEPRINT_ENTITIES.ProductReview.properties.comment.maxLength,
  },
  notificationSubject: {
    min: BLUEPRINT_ENTITIES.EmailNotification.properties.subject.minLength,
    max: BLUEPRINT_ENTITIES.EmailNotification.properties.subject.maxLength,
  },
  notificationBody: {
    min: BLUEPRINT_ENTITIES.EmailNotification.properties.bodyPreview.minLength,
    max: BLUEPRINT_ENTITIES.EmailNotification.properties.bodyPreview.maxLength,
  },
};

export function sanitizeString(input: string, minLen: number, maxLen: number, fallback: string): string {
  const trimmed = input.trim().slice(0, maxLen);
  if (trimmed.length < minLen) {
    return fallback.slice(0, maxLen);
  }
  return trimmed;
}

export function isValidDocumentId(id: string): boolean {
  return id.length >= 1 && id.length <= 128 && VALIDATION_PATTERNS.ID.test(id);
}
