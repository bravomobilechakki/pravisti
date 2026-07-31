# PRAVISTI - Broker Assisted Registration & Onboarding API Documentation

---

# 🏢 Broker Assisted Registration & Onboarding State Machine

This document covers all endpoints for **Broker Assisted Registration**, counterparty search, and the **4-Step Onboarding Wizard State Machine** executed by onboarded Traders (Buyers and Sellers).

### Standard Response Envelope
All API responses follow the standard `ApiResponse` structure:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "...",
  "data": { ... }
}
```

---

## 🔐 Endpoints Directory

### Broker Actions
1. **[Search Counterparty User](#1-search-counterparty-user)** - `GET /api/broker-onboard/search-user`
2. **[Create Business & Onboard Unregistered Party](#2-create-business--onboard-unregistered-party)** - `POST /api/broker-onboard/create-business`
3. **[Broker Verification Queue](#3-broker-verification-queue)** - `GET /api/broker-onboard/my-deal`
4. **[Edit Pending Business Details](#4-edit-pending-business-details)** - `PUT /api/broker-onboard/edit-business/:id`
5. **[Resend WhatsApp Invitation](#5-resend-whatsapp-invitation)** - `POST /api/broker-onboard/resend-invite/:id`
6. **[Cancel Registration](#6-cancel-registration)** - `POST /api/broker-onboard/cancel-onboard/:id`

### Trader Onboarding Wizard Actions (Counterparty)
7. **[Get Pending Verification Status](#7-get-pending-verification-status)** - `GET /api/broker-onboard/pending-verification`
8. **[Step 1: Verify Account Ownership](#8-step-1-verify-account-ownership)** - `POST /api/broker-onboard/verify-account`
9. **[Step 2: Complete Company Profile](#9-step-2-complete-company-profile)** - `PATCH /api/broker-onboard/complete-company`
10. **[Step 3: Verify Products (Seller Only)](#10-step-3-verify-products-seller-only)** - `PATCH /api/broker-onboard/verify-products`
11. **[Unified Ownership Verification](#11-unified-ownership-verification)** - `PATCH /api/broker-onboard/verify`
12. **[Strict Deal Visibility & Product Rules](#12-strict-deal-visibility--product-rules)** - Business Rules

---

## 1. Search Counterparty User

### Endpoint
```http
GET /api/broker-onboard/search-user
```

### Description
Searches for a buyer or seller on Pravisti using their mobile number. Determines whether the target user is already registered or requires Broker Assisted Onboarding.

### Authentication
Required: **Bearer Token (Broker)**

### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mobileNumber` | String | Yes | Mobile number of the counterparty to search |

### Success Responses

#### Case A: User Not Registered (Proceed with Onboarding)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "No registered user found with this mobile number. You can onboard them.",
  "data": {
    "registered": false
  }
}
```

#### Case B: User Already Registered
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Counterparty is registered on Pravisti.",
  "data": {
    "registered": true,
    "user": {
      "id": "64d0a1b2c3d4e5f6a7b8c9d0",
      "name": "Rahul Sharma",
      "mobileNumber": "9876543210"
    },
    "companies": [
      {
        "companyId": "64d0a1b2c3d4e5f6a7b8c9d1",
        "companyName": "Rahul Metal Traders",
        "phone": "9876543210",
        "status": "active",
        "isVerified": true
      }
    ]
  }
}
```

---

## 2. Create Business & Onboard Unregistered Party

### Endpoint
```http
POST /api/broker-onboard/create-business
```

### Description
Registers an unregistered counterparty (Buyer or Seller), creates temporary User, Company, and optional Product records, sends a WhatsApp invite, and sets status to `pending_owner_verification`. Note: Products created during onboarding do not require a category (`categoryId` is optional).

### Request Body
```json
{
  "role": "seller", // "seller" or "buyer"
  "name": "Rahul Sharma",
  "mobileNumber": "9876543210",
  "companyName": "Rahul Metal Traders",
  "companyAddress": {
    "street": "123 Industrial Area",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001"
  },
  "gst": "27ABCDE1234F1Z5",
  "businessDetails": "Wholesale non-ferrous metal supplier",
  "products": [
    {
      "name": "Aluminium Ingot A7",
      "unitId": "64d0a0000000000000000001",
      "description": "99.7% purity aluminium ingots",
      "hsnCode": "76011010",
      "gstCode": "GST_18"
    }
  ]
}
```

---

## 3. Broker Verification Queue

### Endpoint
```http
GET /api/broker-onboard/my-deal
```

### Description
Fetches all assisted onboardings created by the logged-in Broker along with their onboarding status (`accountStatus`, `companyStatus`, `productStatus`).

---

## 4. Edit Pending Business Details

### Endpoint
```http
PUT /api/broker-onboard/edit-business/:id
```

### Description
Allows the Broker to update company details before the Trader verifies ownership.

---

## 5. Resend WhatsApp Invitation

### Endpoint
```http
POST /api/broker-onboard/resend-invite/:id
```

### Description
Resends the WhatsApp onboarding invitation link to the target user.

---

## 6. Cancel Registration

### Endpoint
```http
POST /api/broker-onboard/cancel-onboard/:id
```

### Description
Cancels a pending onboarding, purges temporary records, and rejects associated pending deals.

---

## 7. Get Pending Verification Status

### Endpoint
```http
GET /api/broker-onboard/pending-verification
```

### Description
Checks if the logged-in Trader has a pending onboarding record. Returns step statuses (`accountStatus`, `companyStatus`, `productStatus`), pre-filled company details, and pre-added products list.

### Success Response
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Pending confirmation fetched",
  "data": {
    "pending": true,
    "details": {
      "registrationId": "64d0a2f1c3d4e5f6a7b8c9e0",
      "companyName": "Rahul Metal Traders",
      "brokerName": "Aniket Pandey",
      "brokerCompanyName": "Apex Brokerage Co",
      "role": "seller",
      "createdDate": "2026-07-29T10:00:00.000Z",
      "accountStatus": "pending", // "pending" | "verified" | "rejected"
      "companyStatus": "pending", // "pending" | "verified"
      "productStatus": "pending", // "pending" | "verified"
      "company": {
        "id": "64d0a1b2c3d4e5f6a7b8c9d1",
        "name": "Rahul Metal Traders",
        "registrationNumber": "27ABCDE1234F1Z5",
        "email": "director@company.com",
        "phone": "9876543210",
        "address": { "city": "Mumbai", "state": "Maharashtra" }
      },
      "products": [
        {
          "id": "64d0p1111111111111111111",
          "name": "Aluminium Ingot A7",
          "description": "99.7% purity aluminium ingots",
          "status": "pending_owner_verification"
        }
      ]
    }
  }
}
```

---

## 8. Step 1: Verify Account Ownership

### Endpoint
```http
POST /api/broker-onboard/verify-account
```

### Description
**Step 1 of Onboarding Wizard**: Trader confirms whether they own/recognize the account registered by the Broker.

### Request Body
```json
{
  "status": "approved" // or "rejected"
}
```

### Success Response (Approved)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Account verified successfully",
  "data": {
    "message": "Account verified. Proceed to company verification.",
    "accountStatus": "verified",
    "nextStep": "company",
    "completed": false
  }
}
```

---

## 9. Step 2: Complete Company Profile

### Endpoint
```http
PATCH /api/broker-onboard/complete-company
POST  /api/broker-onboard/complete-profile
```

### Description
**Step 2 of Onboarding Wizard**: Trader reviews and completes their Company Profile (Name, GSTIN, Address, Description).
- **Buyer**: Onboarding finishes here (`completed: true`), unlocks Dashboard.
- **Seller**: Automatically advances to Step 3 (`nextStep: "products"`, `completed: false`).

### Request Body
```json
{
  "status": "approved",
  "name": "Rahul Metal Traders Pvt Ltd",
  "gst": "27ABCDE1234F1Z5",
  "address": {
    "street": "45 Metal Hub",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001"
  },
  "description": "Leading non-ferrous metal supplier in India"
}
```

### Success Response (Seller)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Company profile completed successfully",
  "data": {
    "message": "Company verification complete",
    "companyStatus": "verified",
    "nextStep": "products",
    "completed": false
  }
}
```

---

## 10. Step 3: Verify Products (Seller Only)

### Endpoint
```http
PATCH /api/broker-onboard/verify-products
```

### Description
**Step 3 of Onboarding Wizard (Seller Only)**: Seller verifies and confirms pre-registered products. Activates the products and associated draft deals, completes onboarding (`completed: true`), and unlocks the Dashboard.

### Request Body
```json
{
  "status": "approved",
  "products": ["64d0p1111111111111111111"] // Array of confirmed product ObjectIds
}
```

### Success Response
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Products verified successfully",
  "data": {
    "message": "Products verified successfully",
    "productStatus": "verified",
    "nextStep": "dashboard",
    "completed": true
  }
}
```

---

## 11. Unified Ownership Verification

### Endpoint
```http
PATCH /api/broker-onboard/verify
```

### Description
Unified fallback endpoint accepting `{ "step": "account" | "company" | "products", "status": "approved" }`. Handles step-by-step state transitions seamlessly.

---

## 12. Strict Deal Visibility & Product Rules

### A. Deal Visibility Rule
Deals created with a Seller are **hidden from the Buyer's dashboard** until the Seller's onboarding is 100% complete across all 3 steps (`accountStatus: 'verified'`, `companyStatus: 'verified'`, `productStatus: 'verified'`).

### B. Optional Category Rule for Products
Products do not require a category (`categoryId` is optional). If a product is created without a `categoryId`, the backend automatically resolves or creates a default `"Other"` category, ensuring products can be created, verified, and traded freely.