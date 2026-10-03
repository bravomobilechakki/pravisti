
# PRAVISTI - Buyer, Seller & Broker Deal Creation & Product Access API Guide

---

## 🚀 DEAL ARCHITECTURE & INTEGRATION FLOW (BUYER, SELLER & BROKER)

### Overview
This document specifies the complete workflow for **Buyers**, **Sellers**, and **Brokers** creating deals on Pravisti, including unverified account & company onboarding, unverified product reviews, product access requests, draft deal lifecycle, and automatic state transitions.

```
+-----------------------------------------------------------------------------------+
|                           DEAL CREATION WORKFLOW                                  |
+-----------------------------------------------------------------------------------+
| 1. Buyer, Seller, or Broker initiates deal via `POST /api/deals` or `draft`:      |
|    - If Counterparty Account / Company is unverified -> Onboarding invite sent.   |
|    - If Selected Product is unverified -> Seller Product Verification triggered. |
|    - If Product Access is required -> `ProductAccessRequest` created.             |
| 2. Deal is initially stored as a Draft (`status: "draft"`, e.g. DRAFT-0001).     |
| 3. Deal is strictly VISIBLE ONLY TO THE CREATOR in their Draft section.          |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                            SELLER / COUNTERPARTY REVIEW                           |
+-----------------------------------------------------------------------------------+
| 1. Product Access: Seller reviews via `PATCH /api/deals/broker/product-access/:id`|
| 2. Product Details: Seller reviews via `PATCH /api/products/:id/review`          |
|    - [OPTION A: APPROVE]                                                          |
|       -> Product status set to `"verified"`.                                      |
|       -> Draft deal AUTOMATICALLY transitions to `"pending"` (e.g. DEAL-0042).   |
|       -> Deal becomes visible in both Seller & Buyer consoles for partner review! |
|                                                                                   |
|    - [OPTION B: REJECT] (Reason mandatory)                                        |
|       -> Product status set to `"rejected"`. Rejection reason displayed to Buyer. |
|       -> Deal remains in Draft status for Buyer to edit product / delete deal.    |
|                                                                                   |
|    - [OPTION C: CORRECTION REQUIRED] (Notes mandatory)                           |
|       -> Product status set to `"correction_required"`. Creator updates details. |
+-----------------------------------------------------------------------------------+
```

### 📋 Key Validation Rules & Business Constraints

| Validation Rule | Constraint / Requirement | Error / Behavior |
| :--- | :--- | :--- |
| **Creator Role** | Supported roles: `buyer`, `seller`, or `broker` | Validated in request body & user claims |
| **Company Uniqueness** | Seller & Buyer must be different companies (`sellerCompanyId !== buyerCompanyId`) | HTTP 400: "Seller and Buyer companies must be different" |
| **Broker Non-Participation** | Broker's own company cannot be the Seller or Buyer | HTTP 400: "As a broker, your own company cannot be the Seller or Buyer" |
| **Draft Deal Visibility** | Draft deal visible ONLY to creator until all account/company/product verifications complete | Hidden from counterparty until status moves `draft` -> `pending` |
| **Product Access Approval** | On Seller approval (`"approved"`), draft deal automatically promotes `draft` -> `pending` (`DEAL-XXXX`) | Product becomes `"verified"` / `"active"` |
| **Product Access Rejection** | On Seller rejection (`"rejected"`), rejection reason is saved (`rejectionReason`) | Deal stays `draft` for creator editing |
| **Product Rejection** | Rejection reason is mandatory when rejecting a product or product access request | HTTP 400 if `rejectionReason` is empty |
| **Account Ownership Rejection** | Invited trader rejects account ownership (`"status": "rejected"`) | Temporary records cleaned up, linked draft/pending deals moved to `"rejected"` with reason, broker notified, queue shows `"rejected"` |


### Key Deal & Product Status Enums
- **Deal Statuses**: `["draft", "pending", "approved", "rejected", "expired", "completed"]`
- **Product Statuses**: `["unverified", "verification_pending", "verified", "rejected", "correction_required", "active", "inactive", "pending_owner_verification"]`
- **Product Access Request Statuses**: `["pending", "approved", "rejected"]`

---

## 1. Search Counterparty User
Endpoint
GET /api/broker-onboard/search-user
Description
Searches a counterparty (Buyer/Seller) using their mobile number. This API checks whether the user is already registered on Pravisti. If the user is registered, it returns the user's basic profile along with their verified companies. If the user is not registered, the Broker can proceed with the onboarding process.
Authentication
Required: Bearer Token (Broker)
Query Parameters
Parameter
Type
Required
Description
mobileNumber
String
Yes
Mobile number of the counterparty to search

Request Example
GET /api/broker-onboard/search-user?mobileNumber=6202579799

Success Response (User Registered)

{
    "statusCode": 200,
    "data": {
        "registered": true,
        "user": {
            "id": "6a6b2c3b8fdd636e37db568e",
            "name": "Hdhdjj",
            "mobileNumber": "6202579799"
        },
        "companies": [
            {
                "companyId": "6a6b2c3b8fdd636e37db5692",
                "companyName": "Bdnndnxj",
                "phone": "6202579799",
                "status": "active",
                "isVerified": true
            }
        ]
    },
    "message": "Counterparty is registered on Pravisti.",
    "success": true
}
Response Fields
Field
Type
Description
statusCode
Number
HTTP response status code.
success
Boolean
Indicates whether the request was successful.
message
String
Response message from the server.
data.registered
Boolean
Indicates whether the mobile number belongs to a registered Pravisti user.
data.user.id
String
Unique User ID.
data.user.name
String
Registered user's name.
data.user.mobileNumber
String
Registered mobile number.
data.companies
Array
List of companies associated with the user.
companyId
String
Unique Company ID.
companyName
String
Registered company name.
phone
String
Company contact number.
status
String
Current company status (e.g., active).
isVerified
Boolean
Indicates whether the company has been verified.


Success Response (User Not Registered)

{
    "statusCode": 200,
    "success": true,
    "message": "No registered user found with this mobile number. You can onboard them.",
    "data": {
        "registered": false
    }
}
Business Logic
If registered = true, the Broker can directly select one of the user's existing companies while creating a deal.
If registered = false, the Broker should continue with the Create Business & Onboard Unregistered Party API.
Only authenticated Brokers are allowed to access this endpoint.



2. Create Business & Onboard Unregistered Party
Endpoint
POST /api/broker-onboard/create-business
Description
Creates a temporary User and Company for an unregistered Buyer or Seller, optionally adds products, and starts the Broker Assisted Onboarding process.
Authentication
Required: Bearer Token (Broker)
Request Body

{
  "role": "seller", // "seller" or "buyer"
  "name": "Rahul Sharma",
  "mobileNumber": "9876543210",
  "brokerCompanyId": "64d0a1b2c3d4e5f6a7b8c9d1", // Optional: ID of the broker's specific company
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

Success Response

{
    "statusCode": 201,
    "data": {
        "message": "Unregistered party onboarded successfully",
        "registrationId": "6a6c84316740605c9e4e4856",
        "user": {
            "id": "6a6c84316740605c9e4e484d",
            "name": "Rahul Sharma",
            "mobileNumber": "0876543210"
        },
        "company": {
            "id": "6a6c84316740605c9e4e4851",
            "name": "Rahul Metal Traders"
        },
        "products": [
            {
                "id": "6a6c84316740605c9e4e4854",
                "name": "Aluminium Ingot A7"
            }
        ]
    },
    "message": "Unregistered party onboarded successfully",
    "success": true
}
Response Fields
Field
Type
Description
registrationId
String
Unique onboarding registration ID.
user
Object
Newly created temporary user details.
company
Object
Newly created company details.
products
Array
List of products created during onboarding (if provided).

Business Logic
Creates a temporary User and Company.
Creates product records (for Seller, if provided).
Starts the onboarding workflow.
Returns the Registration ID for tracking the onboarding process.




3. Broker Verification Queue
Endpoint
GET /api/broker-onboard/my-deal
Route Aliases
GET /api/broker-onboard/created-users
GET /api/broker-onboard/onboarded-users
GET /api/broker-onboard/queue
Description
Retrieves all Broker Assisted Onboarding records created by the logged-in Broker, including invited user details, company information, linked deals, and current onboarding & account status (pending, verified, or rejected).
Authentication
Required: Bearer Token (Broker)
Query Parameters
Parameter | Type | Required | Description
companyId | String | No | Filter queue by a specific Broker Company ID

Request Example
GET /api/broker-onboard/my-deal?companyId=6a6b2ae18fdd636e37db5215

Success Response

{
  "statusCode": 200,
  "data": [
    {
      "registrationId": "6a6c84316740605c9e4e4856",
      "role": "seller",
      "status": "pending",
      "accountStatus": "pending",
      "invitedMobile": "0876543210",
      "targetUserName": "Rahul Sharma",
      "brokerName": "Me",
      "brokerCompanyName": "HCBBCBBCBCBCB",
      "creatorRole": "user",
      "company": {
        "id": "6a6c84316740605c9e4e4851",
        "name": "Rahul Metal Traders",
        "address": {
          "street": "123 Industrial Area",
          "city": "Mumbai",
          "state": "Maharashtra",
          "postalCode": "400001"
        },
        "registrationNumber": "27ABCDE1234F1Z5",
        "description": "Wholesale non-ferrous metal supplier"
      },
      "deals": [
        {
          "_id": "6a6c9167c7d58bb5faf77ddd",
          "dealNumber": "DRAFT-0001",
          "status": "draft",
          "createdAt": "2026-07-31T12:13:27.837Z"
        }
      ],
      "createdAt": "2026-07-31T11:17:05.601Z"
    }
  ],
  "message": "Broker verification queue fetched successfully",
  "success": true
}

Response Fields

Field | Type | Description
registrationId | String | Unique onboarding registration ID.
role | String | Counterparty role (buyer or seller).
status | String | Overall onboarding registration status (pending, approved, or rejected).
accountStatus | String | Account verification status (pending, verified, or rejected).
invitedMobile | String | Mobile number used for onboarding.
targetUserName | String | Name of the invited user.
brokerName | String | Name of the broker who initiated onboarding.
brokerCompanyName | String | Company name of the broker.
creatorRole | String | Role of the creator.
company | Object | Company details of the invited user.
deals | Array | List of deals associated with the registration.
createdAt | String | Registration creation timestamp.

Business Logic
- Returns all onboarding records created by the logged-in Broker (supports filtering by `companyId`).
- Supports route aliases `/my-deal`, `/created-users`, `/onboarded-users`, and `/queue`.
- Includes `accountStatus` field: `pending` (verification awaiting trader action), `verified` (trader accepted ownership), or `rejected` (trader rejected ownership).
- If a trader rejects account ownership, the queue displays `accountStatus: "rejected"` and `status: "rejected"`.
- Includes company details and associated deals for each registration to help the Broker track onboarding progress and linked deals.




4. Edit Pending Business Details
Endpoint
PUT /api/broker-onboard/edit-business/:id
Description
Allows the Broker to update the details of a pending onboarding registration before the invited Trader completes the verification process.
Authentication
Required: Bearer Token (Broker)
Path Parameters
Parameter
Type
Required
Description
id
String
Yes
Registration ID of the pending onboarding record.

Request Example
PUT /api/broker-onboard/edit-business/6a6c84316740605c9e4e4856
Request Body

{
  "name": "Rahul Sharma",
  "companyName": "Rahul Metal Traders Pvt Ltd",
  "companyAddress": {
    "street": "45 Metal Hub",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001"
  },
  "gst": "27ABCDE1234F1Z5",
  "businessDetails": "Leading non-ferrous metal supplier",
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
Success Response

{
    "statusCode": 200,
    "data": {
        "message": "Registration details updated successfully"
    },
    "message": "Details updated successfully",
    "success": true
}
Response Fields
Field
Type
Description
statusCode
Number
HTTP status code.
success
Boolean
Indicates whether the request was successful.
message
String
General success message.
data.message
String
Confirms that the registration details were updated successfully.

Business Logic
Updates the pending onboarding registration details.
Can only be performed by the Broker before the Trader verifies the account.
Updates company information and product details if provided.
Returns a success message after the registration details are updated successfully.




5. Resend WhatsApp Invitation
Endpoint
POST /api/broker-onboard/resend-invite/:id
Description
Resends the WhatsApp onboarding invitation to a pending counterparty using the existing onboarding registration.
Authentication
Required: Bearer Token (Broker)
Path Parameters
Parameter
Type
Required
Description
id
String
Yes
Registration ID of the onboarding record.

Request Example
POST /api/broker-onboard/resend-invite/6a6c84316740605c9e4e4856
Request Body
No request body is required.
Success Response

{
    "statusCode": 200,
    "data": {
        "message": "Invitation message resent successfully"
    },
    "message": "Invitation resent successfully",
    "success": true
}
Response Fields
Field
Type
Description
statusCode
Number
HTTP status code.
success
Boolean
Indicates whether the request was successful.
message
String
General success message returned by the API.
data.message
String
Confirms that the WhatsApp invitation was resent successfully.

Business Logic
Resends the WhatsApp onboarding invitation to the invited counterparty.
Uses the existing onboarding registration.
Does not create a new registration.
Returns a success message after the invitation is sent successfully.



6. Cancel Registration
Endpoint
POST /api/broker-onboard/cancel-onboard/:id
Description
Cancels a pending onboarding registration and stops the Broker Assisted Onboarding process for the invited counterparty.
Authentication
Required: Bearer Token (Broker)
Path Parameters
Parameter
Type
Required
Description
id
String
Yes
Registration ID of the onboarding record to cancel.

Request Example
POST /api/broker-onboard/cancel-onboard/6a6c84316740605c9e4e4856
Request Body
No request body is required.
Success Response

{
    "statusCode": 200,
    "data": {
        "message": "Registration cancelled successfully"
    },
    "message": "Registration cancelled successfully",
    "success": true
}
Response Fields
Field
Type
Description
statusCode
Number
HTTP status code.
success
Boolean
Indicates whether the request was successful.
message
String
General success message returned by the API.
data.message
String
Confirms that the onboarding registration was cancelled successfully.

Business Logic
Cancels the specified onboarding registration.
Stops the Broker Assisted Onboarding process for the invited user.
Prevents the pending registration from being used for further onboarding.
Returns a success message after the registration is cancelled successfully.


7. Get Pending Verification Status

> 💡 **COMMON API**: Used by invited **Traders (Buyers or Sellers)** upon logging into the application, to check onboarding requests created by a **Broker**.
> - **Broker Role**: Creates the assisted onboarding record (`POST /api/broker-onboard/create-business`).
> - **Trader Role (Buyer/Seller)**: Executes this API right after login to retrieve onboarding progress and pre-filled company & product data.
> - **Used In**: Root/Login router guard in the Trader application.

Endpoint
GET /api/broker-onboard/pending-verification
Full Request URL
GET http://localhost:8081/api/broker-onboard/pending-verification
Description
Checks whether the logged-in Trader has any pending Broker Assisted Onboarding request. It returns the onboarding step statuses, Broker details, pre-filled company information, and products added by the Broker.
This API is called immediately after the invited Trader logs into the Pravisti platform. It checks whether the logged-in Trader has any pending Broker Assisted Onboarding request. If a pending onboarding exists, the API returns the complete onboarding progress, including account verification status, company verification status, product verification status, Broker details, pre-filled company information, and products added by the Broker. The frontend uses this response to determine which onboarding step should be displayed next. If no pending onboarding exists, the Trader can directly access the normal dashboard. 

Authentication
Required: Bearer Token (Invited Trader)
Authorization: Bearer <TRADER_ACCESS_TOKEN>
Request Body
No request body is required.
Request Example
GET http://localhost:8081/api/broker-onboard/pending-verification
Success Response
        "description": "Wholesale non-ferrous metal supplier",
        "logo": null

{
  "statusCode": 200,
  "data": {
    "pending": true,
    "details": {
      "registrationId": "6a6c8ab7c7d58bb5faf77db4",
      "companyName": "Rahul Metal Traders",
      "brokerName": "aniket kumar",
      "brokerCompanyName": "HCBBCBBCBCBCB",
      "role": "seller",
      "createdDate": "2026-07-31T11:44:55.660Z",
      "accountStatus": "pending",
      "companyStatus": "pending",
      "productStatus": "pending",
      "company": {
        "id": "6a6c8ab7c7d58bb5faf77daf",
        "name": "Rahul Metal Traders",
        "registrationNumber": "27ABCDE1234F1Z5",
        "email": "0676543210@pravisti.temporary.com",
        "phone": "0676543210",
        "address": {
          "street": "123 Industrial Area",
          "city": "Mumbai",
          "state": "Maharashtra",
          "postalCode": "400001",
          "district": null,
          "country": null
        },
        "description": "Wholesale non-ferrous metal supplier",
        "logo": null
      },
      "products": [
        {
          "id": "6a6c8ab7c7d58bb5faf77db2",
          "name": "Aluminium Ingot A7",
          "description": "99.7% purity aluminium ingots",
          "hsnCode": "76011010",
          "gstCode": "GST_18",
          "status": "pending_owner_verification"
        }
      ]
    }
  },
  "message": "Pending confirmation fetched",
  "success": true
}
Response Fields
Field
Type
Description
statusCode
Number
HTTP response status code.
success
Boolean
Indicates whether the request was successful.
message
String
General response message.
data.pending
Boolean
Indicates whether the Trader has a pending onboarding request.
details.registrationId
String
Unique onboarding registration ID.
details.companyName
String
Company name added by the Broker.
details.brokerName
String
Name of the Broker who created the onboarding.
details.brokerCompanyName
String
Broker's company name.
details.role
String
Trader role, such as seller or buyer.
details.createdDate
String
Onboarding creation date and time.
details.accountStatus
String
Account ownership verification status.
details.companyStatus
String
Company verification status.
details.productStatus
String
Product verification status.
details.company
Object
Pre-filled company details.
details.products
Array
Products added by the Broker during onboarding.


Status Meaning
accountStatus: pending
Trader has not yet confirmed account ownership.
companyStatus: pending
Company profile verification is not completed.
productStatus: pending
Seller has not verified the products yet.
Business Logic
This API is called after the invited Trader logs in.
It returns the Trader's current onboarding progress.
For a Seller, account, company, and product statuses are returned.
For a Buyer, product verification may not be required.
Product IDs returned here are used later in the verify-products API.
When pending is true, the Trader must continue the onboarding wizard.
Next Step
Since the current response has:
{
  "accountStatus": "pending",
  "companyStatus": "pending",
  "productStatus": "pending"
}
the next API will be:
POST http://localhost:8081/api/broker-onboard/verify-account
Request body:
{
  "status": "approved"
}




8. Verify Account Ownership

> 💡 **COMMON API**: Executed by the invited **Trader (Buyer or Seller)** and impacts the **Broker's Verification Queue**.
> - **Trader Role (Executing Role)**: Trader confirms (`status: "approved"`) or rejects (`status: "rejected"`) account ownership.
> - **Broker Role (Impacted Role)**: If approved, broker sees account status update in queue. If rejected, broker receives notification and sees `accountStatus: "rejected"` & `status: "rejected"` in verification queue, with linked draft deals cancelled.
> - **Used In**: Step 1 of Trader Onboarding Wizard.

Endpoint
POST /api/broker-onboard/verify-account
PATCH /api/broker-onboard/verify-account
ALL /api/broker-onboard/verify
Description
This API is the first step of the Broker Assisted Onboarding process. It is used by the invited Trader to confirm or reject ownership of the account created by the Broker.
- If the Trader **approves** ownership (`"status": "approved"`), the system confirms account ownership, updates `accountStatus` to `"verified"`, and moves to the next onboarding step (`"company"` profile completion).
- If the Trader **rejects** ownership (`"status": "rejected"`), the system marks the registration as `"rejected"`, cleans up temporary user/company records, transitions any linked pending/draft deals to `"rejected"` status with a rejection reason, and notifies the Broker.

Authentication
Required: Bearer Token (Invited Trader)
Authorization: Bearer <TRADER_ACCESS_TOKEN>

Request Body Fields
Field | Type | Required | Description
status | String | Yes | Ownership verification decision. Supported values: `"approved"` or `"rejected"`.

Request Example (Approve Ownership)
POST /api/broker-onboard/verify-account
{
  "status": "approved"
}

Success Response (Approve Ownership)
{
  "statusCode": 200,
  "data": {
    "message": "Account verification complete",
    "accountStatus": "verified",
    "nextStep": "company"
  },
  "message": "Account verified successfully",
  "success": true
}

Request Example (Reject Ownership)
POST /api/broker-onboard/verify-account
{
  "status": "rejected"
}

Success Response (Reject Ownership)
{
  "statusCode": 200,
  "data": {
    "message": "Account rejected and cleaned up successfully",
    "accountStatus": "rejected"
  },
  "message": "Account rejected",
  "success": true
}

Response Fields
Field | Type | Description
statusCode | Number | HTTP response status code.
success | Boolean | Indicates whether the request was successful.
message | String | General success response message.
data.message | String | Detailed status confirmation message.
data.accountStatus | String | Account verification status (`"verified"` or `"rejected"`).
data.nextStep | String | Next onboarding step (e.g. `"company"` if approved).

Business Logic
- **Approve Ownership (`"status": "approved"`)**:
  1. Sets `accountStatus` to `"verified"`.
  2. Links company ownership to the logged-in user.
  3. Returns `nextStep: "company"` for the frontend wizard to proceed to company profile completion.
- **Reject Ownership (`"status": "rejected"`)**:
  1. Sets onboarding `accountStatus` and overall `status` to `"rejected"`.
  2. Performs cleanup: deletes/inactivates temporary user and company records created during assisted onboarding.
  3. Transitions all associated draft and pending deals involving the target company to `"rejected"` status with an explicit `rejectionReason` (e.g., *"Seller/Buyer rejected account ownership verification for company: <Company Name>."*).
  4. Triggers a system notification to the Broker informing them that the ownership verification was rejected.
  5. Displays the rejected status in the Broker's verification queue.




9. Complete Company Profile
Endpoint
PATCH /api/broker-onboard/complete-company
Full Request URL
PATCH http://localhost:8081/api/broker-onboard/complete-company
Description
This API is the second step of the Broker Assisted Onboarding process. It allows the invited Trader to review, update, and confirm the company information initially added by the Broker.
After the account ownership is confirmed, the Trader uses this API to verify important business details such as the company name, GST number, address, and business description.
For a Seller, successful company verification moves the onboarding process to the Product Verification step. For a Buyer, the onboarding process may be completed after company verification because product verification is not required.
Authentication
Required: Bearer Token (Invited Trader)
Authorization: Bearer <TRADER_ACCESS_TOKEN>
Request Body

{
  "status": "approved",
  "name": "Rahul Metal Traders",
  "gst": "27ABCDE1234F1Z5",
  "address": {
    "street": "123 Industrial Area",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001"
  },
  "description": "Wholesale non-ferrous metal supplier"
}
Request Body Fields
Field
Type
Required
Description
status
String
Yes
Company verification decision. Use approved to confirm the company profile.
name
String
Yes
Legal or business name of the Trader’s company.
gst
String
Conditional
GST registration number of the company.
address
Object
Yes
Complete registered or operating address of the company.
address.street
String
Yes
Street or business location.
address.city
String
Yes
City where the company operates.
address.state
String
Yes
State where the company is registered or located.
address.postalCode
String
Yes
Postal or PIN code of the company address.
description
String
No
Short description of the company’s business activities.

Success Response

{
  "statusCode": 200,
  "data": {
    "message": "Company verification complete",
    "companyStatus": "verified",
    "nextStep": "products",
    "completed": false
  },
  "message": "Company profile completed successfully",
  "success": true
}
Response Fields
Field
Type
Description
statusCode
Number
HTTP response status code.
success
Boolean
Indicates whether the request was completed successfully.
message
String
General API success message.
data.message
String
Confirms that the company verification step is complete.
data.companyStatus
String
Current company verification status. A value of verified means the profile has been approved.
data.nextStep
String
Indicates the next onboarding step. Here, products means the Seller must verify their products.
data.completed
Boolean
Indicates whether the complete onboarding flow has finished.

How This API Works
The API identifies the onboarding registration using the logged-in Trader’s access token.
It checks whether the Trader has already confirmed account ownership.
It validates the submitted company information.
It updates the company details created earlier by the Broker.
It changes companyStatus from pending to verified.
It checks the role of the onboarded Trader.
Since the current Trader is a Seller, the backend returns nextStep: "products".
The response contains completed: false because Seller product verification is still pending.
The frontend should redirect the Seller to the Product Verification screen after this response.
Current Testing Result
The API has worked successfully.
Company status: verified
Next step: products
Onboarding completed: false
This confirms that:
Company profile has been verified.
Seller onboarding is still active.
Product verification is now required.
The next API to test is API 10.
Next API
PATCH http://localhost:8081/api/broker-onboard/verify-products
Use the product ID received from the pending-verification API:
6a6c8ab7c7d58bb5faf77db2
Request body:

{
  "status": "approved",
  "products": [
    "6a6c8ab7c7d58bb5faf77db2"
  ]
}






=================Product Access=================

1. Create Draft Deal & Request Product Access
Endpoint
POST /api/deals/broker/draft
Full Request URL
POST http://localhost:8081/api/deals/broker/draft
Description
This API is the first step of the Broker Draft Deal workflow. It allows a Broker to create a draft deal between a Buyer and a Seller before the actual deal is finalized.
When the Broker submits this request, the system creates a new draft deal and automatically generates a Product Access Request for the Seller. The requested products remain inaccessible to the Broker until the Seller approves the request.
The draft deal is created with the status draft, while the Product Access Request is created with the status pending. Once the Seller approves the request, the Broker can proceed to add pricing, quantities, discounts, and complete the deal.
Authentication
Required: Bearer Token (Broker)
Authorization: Bearer <BROKER_ACCESS_TOKEN>
Request Body
{
  "sellerCompanyId": "6a69ee0c958aceae3071b780",
  "buyerCompanyId": "6a69ec6020b157166cc31c7b",
  "expiryDate": "2026-12-31T23:59:59.000Z",
  "notes": "Draft deal for Aluminium Ingot A7 supply",
  "productIds": [
    "6a69ee0c958aceae3071b783"
  ]
}
Request Body Fields
Field
Type
Required
Description
sellerCompanyId
String
Yes
ObjectId of the Seller's company.
buyerCompanyId
String
Yes
ObjectId of the Buyer's company.
expiryDate
Date
Yes
Date and time until which the draft deal remains valid.
notes
String
No
Additional notes or remarks related to the draft deal.
productIds
Array<String>
Yes
List of Seller product IDs for which access is requested.

Success Response
{
  "statusCode": 201,
  "data": {
    "deal": {
      "_id": "6a6c9167c7d58bb5faf77ddd",
      "dealNumber": "DRAFT-0001",
      "status": "draft",
      "buyerCompanyId": "6a69ec6020b157166cc31c7b",
      "sellerCompanyId": "6a69ee0c958aceae3071b780",
      "brokerCompanyId": "6a6b2ae18fdd636e37db5215"
    },
    "accessRequest": {
      "_id": "6a6c9167c7d58bb5faf77de2",
      "dealId": "6a6c9167c7d58bb5faf77ddd",
      "status": "pending",
      "productIds": [
        "6a69ee0c958aceae3071b783"
      ]
    }
  },
  "message": "Draft deal created and product access requested successfully",
  "success": true
}
Response Fields
Field
Type
Description
statusCode
Number
HTTP response status code.
success
Boolean
Indicates whether the request was successful.
message
String
General success message returned by the API.
data.deal
Object
Newly created draft deal information.
data.deal._id
String
Unique Draft Deal ID.
data.deal.dealNumber
String
Auto-generated draft deal number.
data.deal.status
String
Current deal status. Initially draft.
data.accessRequest
Object
Product Access Request created for the Seller.
data.accessRequest._id
String
Unique Product Access Request ID.
data.accessRequest.dealId
String
Draft Deal linked to this request.
data.accessRequest.status
String
Current request status. Initially pending.
data.accessRequest.productIds
Array
List of products for which access has been requested.

Business Logic
The API verifies that the logged-in user is a Broker.
Validates the Buyer Company, Seller Company, and requested Product IDs.
Creates a new draft deal with the status draft.
Automatically creates a Product Access Request linked to the draft deal.
Marks the Broker's approval as approved, while the Buyer and Seller approvals remain pending.
Initializes all pricing fields (grandTotal, totalAmount, totalGSTAmount, etc.) with 0 because product pricing has not yet been finalized.
Sets the Product Access Request status to pending until the Seller reviews it.
Returns both the newly created Draft Deal and the Product Access Request in a single response.
The Product Access Request ID returned by this API is used in the Approve/Reject Product Access Request API.
The Draft Deal ID returned by this API is used later in the Complete Draft Deal API after the Seller grants product access.
Next Step
After the draft deal is created successfully, the Seller should fetch pending Product Access Requests using:
GET /api/deals/broker/product-access?companyId=<SELLER_COMPANY_ID>
This allows the Seller to review and approve or reject the Broker's request before the draft deal can be



2. Get Product Access Requests (Seller View)

> 💡 **COMMON API**: Connects **Broker** and **Seller**.
> - **Broker Role**: Triggers creation of Product Access Request when creating a draft deal (`POST /api/deals/broker/draft`).
> - **Seller Role (Executing Role)**: Uses this endpoint (`GET /api/deals/broker/product-access?companyId=...`) to view all pending requests submitted by Brokers for their company.
> - **Used In**: Seller Product Access Requests Screen.

Endpoint
GET /api/deals/broker/product-access?companyId=:sellerCompanyId
Full Request URL
GET http://localhost:8081/api/deals/broker/product-access?companyId=6a69ee0c958aceae3071b780
Description
This API allows the Seller to view all pending and processed Product Access Requests submitted by Brokers for their company. Whenever a Broker creates a draft deal, the system automatically generates a Product Access Request. This API returns those requests along with Broker details, Buyer information, Draft Deal information, and the list of requested products.
The Seller uses this API to review each request before deciding whether to approve or reject the Broker's access to the requested products.
Authentication
Required: Bearer Token (Seller Owner / Seller User)
Authorization: Bearer <SELLER_ACCESS_TOKEN>
Query Parameters
Parameter
Type
Required
Description
companyId
String
Yes
ObjectId of the Seller's company whose product access requests need to be fetched.

Request Example
GET http://localhost:8081/api/deals/broker/product-access?companyId=6a69ee0c958aceae3071b780
Request Body
No request body is required.
Success Response
{
  "statusCode": 200,
  "data": [
    {
      "_id": "6a6c9167c7d58bb5faf77de2",
      "brokerCompanyId": {
        "_id": "6a6b2ae18fdd636e37db5215",
        "name": "HCBBCBBCBCBCB",
        "email": "hxh@gmsil.com",
        "phone": "7667676769",
        "type": "trader"
      },
      "sellerCompanyId": "6a69ee0c958aceae3071b780",
      "buyerCompanyId": {
        "_id": "6a69ec6020b157166cc31c7b",
        "name": "rrrrrrrrrrrrrrrrrr",
        "email": "9708382522@pravisti.temporary.com",
        "phone": "9708382522",
        "type": "trader"
      },
      "dealId": {
        "_id": "6a6c9167c7d58bb5faf77ddd",
        "dealNumber": "DRAFT-0001",
        "dealDate": "2026-07-31T12:13:27.837Z",
        "expiryDate": "2026-12-31T23:59:59.000Z",
        "notes": "Draft deal for Aluminium Ingot A7 supply",
        "status": "draft"
      },
      "productIds": [
        {
          "_id": "6a69ee0c958aceae3071b783",
          "name": "ggfffg",
          "status": "active",
          "gstCode": "0%"
        }
      ],
      "status": "pending",
      "requestedBy": "6a69eb9f20b157166cc318fe",
      "resolvedBy": null,
      "resolvedAt": null,
      "createdAt": "2026-07-31T12:13:27.910Z",
      "updatedAt": "2026-07-31T12:13:27.910Z"
    }
  ],
  "message": "Product access requests fetched successfully",
  "success": true
}
Response Fields
Field
Type
Description
statusCode
Number
HTTP response status code.
success
Boolean
Indicates whether the request was successful.
message
String
General success message returned by the API.
data
Array
List of Product Access Requests for the Seller's company.
data._id
String
Unique Product Access Request ID.
data.brokerCompanyId
Object
Details of the Broker's company that requested access.
data.buyerCompanyId
Object
Buyer company involved in the draft deal.
data.sellerCompanyId
String
Seller company receiving the request.
data.dealId
Object
Draft deal information linked to this request.
data.productIds
Array
List of products for which the Broker has requested access.
data.status
String
Current request status (pending, approved, or rejected).
data.requestedBy
String
User ID of the Broker who created the request.
data.resolvedBy
String | Null
User ID of the Seller who approved or rejected the request.
data.resolvedAt
Date | Null
Date and time when the request was processed.

Business Logic
This API is called after the Seller logs into the application.
It retrieves all Product Access Requests associated with the Seller's company.
Returns complete Broker company information so the Seller knows who requested access.
Returns Buyer company details linked to the draft deal.
Returns the Draft Deal details including deal number, expiry date, notes, and current status.
Returns the list of products the Broker wants to access for creating the deal.
Displays the current request status (pending, approved, or rejected).
If the request is pending, the Seller can approve or reject it.
Once approved, the Broker becomes eligible to complete the draft deal.
If rejected, the Broker cannot proceed with the requested products.
The Product Access Request ID (_id) returned by this API is used in the Approve/Reject Product Access Request API.
Next Step
After selecting a pending request, the Seller should approve or reject it using:
PATCH /api/deals/broker/product-access/6a6c9167c7d58bb5faf77de2
Request Body:
{
  "status": "approved"
}
or
{
  "status": "rejected"
}



3. Respond to Product Access Request

> 💡 **COMMON API**: Executed by **Seller** and unlocks workflow for **Broker**.
> - **Seller Role (Executing Role)**: Seller approves (`"status": "approved"`) or rejects (`"status": "rejected"`) the Broker's access request.
> - **Broker Role (Impacted Role)**: On approval, product status becomes `"active"` and the linked draft deal automatically promotes to `"pending"` (`DEAL-XXXX`), enabling the Broker to proceed to `PUT /api/deals/broker/draft/:dealId/complete`.
> - **Used In**: Seller Product Access Approval Modal.

Endpoint
PATCH /api/deals/broker/product-access/:requestId
Full Request URL
PATCH http://localhost:8081/api/deals/broker/product-access/6a6c9167c7d58bb5faf77de2
Description
This API allows the Seller to approve or reject a Product Access Request submitted by a Broker. The Seller reviews the Broker company, Buyer company, draft deal, and requested products before taking action.
When the Seller approves the request, the Broker receives permission to use the requested Seller products while completing the linked draft deal. The API also records which Seller user processed the request and the exact date and time of approval or rejection.
Authentication
Required: Bearer Token (Seller Owner)
Authorization: Bearer <SELLER_ACCESS_TOKEN>
Path Parameters
Parameter
Type
Required
Description
requestId
String
Yes
Unique ObjectId of the Product Access Request.

Request Body
{
  "status": "approved"
}
Request Body Fields
Field
Type
Required
Description
status
String
Yes
Seller's decision. Supported values are approved and rejected.

Success Response
{
  "statusCode": 200,
  "data": {
    "_id": "6a6c9167c7d58bb5faf77de2",
    "brokerCompanyId": "6a6b2ae18fdd636e37db5215",
    "sellerCompanyId": "6a69ee0c958aceae3071b780",
    "buyerCompanyId": "6a69ec6020b157166cc31c7b",
    "dealId": "6a6c9167c7d58bb5faf77ddd",
    "productIds": [
      "6a69ee0c958aceae3071b783"
    ],
    "status": "approved",
    "requestedBy": "6a69eb9f20b157166cc318fe",
    "resolvedBy": "6a69ee0c958aceae3071b77c",
    "resolvedAt": "2026-07-31T12:21:26.405Z",
    "createdAt": "2026-07-31T12:13:27.910Z",
    "updatedAt": "2026-07-31T12:21:26.405Z",
    "__v": 0
  },
  "message": "Product access request approved successfully",
  "success": true
}
Response Fields
Field
Type
Description
statusCode
Number
HTTP response status code.
success
Boolean
Indicates whether the request was processed successfully.
message
String
General approval or rejection confirmation message.
data._id
String
Product Access Request ID.
data.brokerCompanyId
String
Broker company associated with the request.
data.sellerCompanyId
String
Seller company that received the request.
data.buyerCompanyId
String
Buyer company involved in the draft deal.
data.dealId
String
Draft Deal linked to the Product Access Request.
data.productIds
Array<String>
Products for which the Broker requested access.
data.status
String
Final request status, such as approved or rejected.
data.requestedBy
String
User ID of the Broker who submitted the request.
data.resolvedBy
String
Seller user ID who approved or rejected the request.
data.resolvedAt
Date
Date and time when the request was processed.
data.createdAt
Date
Date and time when the Product Access Request was created.
data.updatedAt
Date
Date and time when the request was last updated.

How This API Works
1. The Seller selects a pending Product Access Request via `GET /api/deals/broker/product-access?companyId=:sellerCompanyId`.
2. The backend verifies that the logged-in user represents the Seller company.
3. The Seller submits either `"approved"` or `"rejected"`.
4. **On Approval (`"approved"`)**:
   - Request status changes to `"approved"`.
   - Requested product status changes to `"active"`.
   - Linked draft deal **automatically transitions** from `"draft"` to `"pending"` with official `dealNumber` (`DEAL-XXXX`).
   - Seller and Buyer are notified to review and approve the deal!
5. **On Rejection (`"rejected"`)**:
   - Request status changes to `"rejected"`.
   - Requested proposed products are marked `"rejected"` & `isDeleted: true`.
   - Linked draft deal **automatically transitions** from `"draft"` to **`"rejected"`**.
   - Broker is notified of the rejection.
Current Testing Result
The Product Access Request was approved successfully.
Request ID: 6a6c9167c7d58bb5faf77de2
Status: approved
Resolved By: 6a69ee0c958aceae3071b77c
Linked Draft Deal: 6a6c9167c7d58bb5faf77ddd
Approved Product: 6a69ee0c958aceae3071b783
Next Step
Now switch back to the Broker token and complete the Draft Deal.
PUT http://localhost:8081/api/deals/broker/draft/6a6c9167c7d58bb5faf77ddd/complete
Request Body:
{
  "products": [
    {
      "productId": "6a69ee0c958aceae3071b783",
      "quantity": 100,
      "price": 45,
      "discount": 5
    }
  ],
  "notes": "Final deal agreement for Aluminium Ingot A7"
}



4. Complete Draft Deal
Endpoint
PUT /api/deals/broker/draft/:dealId/complete
Full Request URL
PUT http://localhost:8081/api/deals/broker/draft/6a6c9167c7d58bb5faf77ddd/complete
Description
This API is the final step of the Broker Draft Deal workflow. It is called after the Seller approves the Product Access Request.
The Broker uses this API to add the final product details, including quantity, price, discount, payment terms, and deal notes. After successful submission, the draft deal is converted into a normal pending deal and sent to the Seller and Buyer for approval.
The Broker is automatically marked as approved because the deal was created and completed by the Broker. The Seller and Buyer remain pending until they individually approve or reject the deal.
Authentication
Required: Bearer Token (Broker)
Authorization: Bearer <BROKER_ACCESS_TOKEN>
Path Parameters
Parameter
Type
Required
Description
dealId
String
Yes
Unique ObjectId of the draft deal that needs to be completed.

Request Body
{
  "products": [
    {
      "productId": "6a69ee0c958aceae3071b783",
      "quantity": 100,
      "price": 45,
      "discount": 5
    }
  ],
  "notes": "Final deal agreement for Aluminium Ingot A7"
}
Request Body Fields
Field
Type
Required
Description
products
Array
Yes
List of products to include in the final deal.
products[].productId
String
Yes
Seller product ObjectId approved through the Product Access Request.
products[].quantity
Number
Yes
Product quantity included in the deal.
products[].price
Number
Yes
Price per unit of the product.
products[].discount
Number
No
Discount applied to the product. Based on the current response, this is being treated as a flat amount.
notes
String
No
Final terms or additional remarks for the deal.

Success Response
{
  "statusCode": 200,
  "data": {
    "deal": {
      "_id": "6a6c9167c7d58bb5faf77ddd",
      "dealNumber": "DEAL-0015",
      "role": "broker",
      "status": "pending",
      "products": [
        {
          "productId": {
            "_id": "6a69ee0c958aceae3071b783",
            "name": "ggfffg",
            "gstCode": "0%",
            "unitId": {
              "_id": "6a69ebd68b856243dd0b3c0c",
              "name": "kilog",
              "shortName": "sdds"
            }
          },
          "name": "ggfffg",
          "unitName": "kilog",
          "unitShortName": "sdds",
          "quantity": 100,
          "price": 45,
          "subtotal": 4500,
          "gst": 0,
          "gstAmount": 0,
          "discount": 5,
          "totalAmount": 4495
        }
      ],
      "totalSubtotal": 4500,
      "totalDiscount": 5,
      "totalGSTAmount": 0,
      "grandTotal": 4495,
      "totalAmount": 4495,
      "notes": "Final deal agreement for Aluminium Ingot A7",
      "approvalStatus": {
        "seller": "pending",
        "buyer": "pending",
        "broker": "approved"
      },
      "viewerApprovalStatus": "approved",
      "pendingApprovalFor": "seller, buyer",
      "remainingPayment": 4495,
      "remainingQuantity": 100
    }
  },
  "message": "Draft deal completed successfully",
  "success": true
}
Response Fields
Field
Type
Description
statusCode
Number
HTTP response status code.
success
Boolean
Indicates whether the draft deal was completed successfully.
message
String
General success message.
data.deal._id
String
Completed Deal ObjectId.
data.deal.dealNumber
String
Final deal number generated after draft completion.
data.deal.status
String
Current deal status. It becomes pending after draft completion.
data.deal.products
Array
Finalized product details added by the Broker.
products[].quantity
Number
Final product quantity.
products[].price
Number
Price per unit.
products[].subtotal
Number
Quantity multiplied by price.
products[].gstAmount
Number
Calculated GST amount.
products[].discount
Number
Discount applied to the product.
products[].totalAmount
Number
Final amount after GST and discount.
totalSubtotal
Number
Sum of product subtotals before GST and discounts.
totalDiscount
Number
Total discount applied to the deal.
totalGSTAmount
Number
Total GST amount across all products.
grandTotal
Number
Final payable deal amount.
approvalStatus
Object
Approval status of Seller, Buyer, and Broker.
pendingApprovalFor
String
Parties whose approval is still pending.
remainingPayment
Number
Amount that remains to be paid.
remainingQuantity
Number
Product quantity that remains to be delivered.

How This API Works
The backend verifies that the logged-in user is the Broker who created the draft deal.
It checks whether the draft deal exists and is still in draft status.
It verifies that the Seller has approved the linked Product Access Request.
It validates that all supplied products were included in the approved access request.
It stores the final product quantity, price, discount, GST, and total amount.
It changes the deal number from a draft number such as DRAFT-0001 to a final deal number such as DEAL-0015.
It changes the deal status from draft to pending.
It automatically marks the Broker approval as approved.
It keeps the Seller and Buyer approval statuses as pending.
It initializes payment tracking using the calculated grand total.
It initializes delivery tracking using the final product quantity.
The completed deal is now ready for Seller and Buyer approval.

---

## 14. Seller Product Review (Approve / Reject / Correction Required)

### Endpoint
```http
PATCH /api/products/:id/review
```

### Description
Allows the Seller (owner company) to review an unverified product created under their company by a Buyer or Broker. The Seller can Approve (`verified`), Reject (`rejected` with mandatory reason), or Request Correction (`correction_required` with mandatory notes).

### Authentication
Required: **Bearer Token (Seller Owner)**

### Request Body Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `action` | String | Yes | Review action: `"approve"`, `"reject"`, or `"request_correction"` |
| `rejectionReason` | String | Conditional | Mandatory when `action` is `"reject"` |
| `correctionNotes` | String | Conditional | Mandatory when `action` is `"request_correction"` |

### Request Example (Approve Product)
```json
{
  "action": "approve"
}
```

### Request Example (Reject Product)
```json
{
  "action": "reject",
  "rejectionReason": "Incorrect HSN code and specifications do not match our manufacturing catalog."
}
```

### Request Example (Request Correction)
```json
{
  "action": "request_correction",
  "correctionNotes": "Please update unit price to include packaging charges."
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Product review completed: verified",
  "data": {
    "_id": "64d0a1b2c3d4e5f6a7b8c9e0",
    "name": "Aluminium Ingot A7",
    "status": "verified",
    "rejectionReason": "",
    "correctionNotes": ""
  }
}
```


