# PRAVISTI - API Documentation

---

# USER & PUBLIC SECTION

---

# 🔐 Authentication APIs

---

## 1. Signup API (OTP-Based)

### Endpoint

```http
POST /api/auth/signup
```

### Description

This endpoint is used to register a new user using mobile number and OTP verification.

The user provides:

* Name
* Role
* Mobile Number

An OTP is sent to the provided mobile number for verification.

### Request Body

```json
{
  "name": "Raushan",
  "role": "trader",
  "mobileNumber": "7061901464"
}
```

### Success Response

```json
{
  "statusCode": 201,
  "data": {
    "expiresIn": 600,
    "mobileNumber": "6202579799",
    "name": "Raj Kumar",
    "role": "trader",
    "sentVia": "WhatsApp",
    "message": "OTP sent successfully via WhatsApp"
  },
  "message": "Signup successful. OTP sent to your mobile.",
  "success": true
}
```

### Response Fields

| Field        | Type   | Description                 |
| ------------ | ------ | --------------------------- |
| expiresIn    | Number | OTP expiry time in seconds  |
| mobileNumber | String | User mobile number          |
| name         | String | User full name              |
| role         | String | Selected user role          |
| sentVia      | String | OTP delivery channel        |
| message      | String | OTP delivery status message |

---

## 2. Verify OTP API

### Endpoint

```http
POST /api/auth/verify-otp
```

### Description

This endpoint is used to verify the OTP sent to the user's mobile number and complete authentication.

The user submits:

* Mobile Number
* OTP

If the OTP is valid, the system:

* Verifies the user
* Generates a JWT token
* Returns user details
* Provides role-based dashboard redirect URL

### Request Body

```json
{
  "mobileNumber": "7061901464",
  "otp": "7614"
}
```

### Success Response

```json
{
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2YTBhYWFkNjI3NWNjNWUwNDY0NzMwOTQiLCJpYXQiOjE3NzkwODQyMzQsImV4cCI6MTc3OTY4OTAzNH0.c_GSj8kJOZzOq1k_QCcdxf5lQmoMCzAbGFR8c50tzHY",
    "user": {
      "id": "6a0aaad6275cc5e046473094",
      "mobileNumber": "7061901464",
      "name": "Raushan",
      "roles": [
        "trader"
      ],
      "status": "active",
      "dashboardRedirect": "/dashboard/trader"
    }
  },
  "message": "OTP verified successfully. Login successful!",
  "success": true
}
```

### Response Fields

#### Token Information

| Field | Type   | Description              |
| ----- | ------ | ------------------------ |
| token | String | JWT authentication token |

#### User Information

| Field             | Type   | Description                 |
| ----------------- | ------ | --------------------------- |
| id                | String | User unique identifier      |
| mobileNumber      | String | Registered mobile number    |
| name              | String | User full name              |
| roles             | Array  | Assigned user roles         |
| status            | String | User account status         |
| dashboardRedirect | String | Dashboard URL based on role |

---

## 3. Login API

### Endpoint

```http
POST /api/auth/login
```

### Description

This endpoint is used to log in an existing user using mobile number and OTP verification.

The user provides a registered mobile number. An OTP is sent to that number for authentication.

### Request Body

```json
{
  "mobileNumber": "6202579799"
}
```

### Success Response

```json
{
  "statusCode": 200,
  "data": {
    "expiresIn": 600,
    "mobileNumber": "6202579799",
    "role": "trader",
    "sentVia": "WhatsApp",
    "message": "OTP sent successfully via WhatsApp"
  },
  "message": "OTP sent to your mobile. Please verify to login.",
  "success": true
}
```

### Response Fields

| Field        | Type   | Description                 |
| ------------ | ------ | --------------------------- |
| expiresIn    | Number | OTP expiry time in seconds  |
| mobileNumber | String | Registered mobile number    |
| role         | String | User role                   |
| sentVia      | String | OTP delivery channel        |
| message      | String | OTP delivery status message |

---

## 4. Get Current User API

### Endpoint

```http
GET /api/auth/me
```

### Description

This endpoint is used to fetch the details of the currently authenticated user, including their roles and linked companies.

### Authentication

**Required:** Yes

```http
Authorization: Bearer <JWT_TOKEN>
```

### Success Response

```json
{
  "statusCode": 200,
  "data": {
    "_id": "6a26b3beb9ea0bd40b88ae44",
    "name": "Raushan pandey",
    "email": null,
    "profilePicture": null,
    "mobileNumber": "7061901464",
    "isOtpVerified": true,
    "roles": [
      "trader"
    ],
    "companies": [
      {
        "address": {
          "street": "mahal jagatpura , jaipur rajsthan 302017",
          "city": "jaipur",
          "state": "Rajasthan",
          "postalCode": "302017",
          "country": "India"
        },
        "_id": "6a26b626b9ea0bd40b88b0c5",
        "name": "netparam technologies pvt ltd",
        "email": "raushanpandey845425@gmail.com",
        "phone": "+916202579799",
        "type": "trader",
        "registrationNumber": "refgs566",
        "industry": "6a26b530b9ea0bd40b88af63",
        "owner": "6a26b3beb9ea0bd40b88ae44",
        "employees": [],
        "status": "active",
        "isVerified": true,
        "verifiedAt": "2026-06-08T12:31:34.994Z",
        "verifiedBy": null,
        "website": null,
        "description": null,
        "logo": null,
        "isDeleted": false,
        "deletedAt": null,
        "documents": [],
        "createdAt": "2026-06-08T12:31:34.995Z",
        "updatedAt": "2026-06-08T12:31:34.995Z",
        "__v": 0
      }
    ],
    "status": "active",
    "lastLoginAt": "2026-06-10T05:12:50.683Z",
    "lastOtpSentAt": null,
    "createdAt": "2026-06-08T12:21:18.803Z",
    "updatedAt": "2026-06-10T05:12:50.685Z",
    "__v": 1
  },
  "message": "User fetched successfully",
  "success": true
}
```

### Response Fields

| Field          | Type    | Description                                 |
| -------------- | ------- | ------------------------------------------- |
| _id            | String  | User ID                                     |
| name           | String  | User name                                   |
| email          | String  | User email address                          |
| profilePicture | String  | User profile picture URL                    |
| mobileNumber   | String  | User mobile number                          |
| isOtpVerified  | Boolean | OTP verification status                     |
| roles          | Array   | List of roles assigned to the user          |
| companies      | Array   | List of companies owned/managed by the user |
| status         | String  | User status                                 |
| lastLoginAt    | Date    | Last login timestamp                        |
| createdAt      | Date    | User creation timestamp                     |
| updatedAt      | Date    | User update timestamp                       |

---

## 5. Logout API

### Endpoint

```http
POST /api/auth/logout
```

### Description

This endpoint is used to log out the currently authenticated user.

### Authentication

**Required:** Yes

```http
Authorization: Bearer <JWT_TOKEN>
```

### Success Response

```json
{
  "statusCode": 200,
  "data": {
    "message": "Logged out successfully"
  },
  "message": "Logged out successfully",
  "success": true
}
```

### Response Fields

| Field   | Type   | Description            |
| ------- | ------ | ---------------------- |
| message | String | Logout status message  |

---

# 👤 User Profile APIs

---

## 6. Get User Basic Profile API

### Endpoint

```http
GET /api/users/profile
```

### Description

This endpoint is used to fetch the basic profile information of the authenticated user.

The API returns:

* Name
* Email Address
* Mobile Number
* Profile Picture
* User Role / Type
* Total Linked Companies

This information is primarily used for:

* Dashboard profile section
* Mobile application profile screen
* User account overview

### Success Response

```json
{
  "statusCode": 200,
  "data": {
    "name": "raushan",
    "email": "",
    "mobileNumber": "6202579799",
    "profilePicture": "",
    "userType": "broker",
    "totalCompanies": 0
  },
  "message": "User profile fetched successfully",
  "success": true
}
```

### Response Fields

| Field          | Type   | Description              |
| -------------- | ------ | ------------------------ |
| name           | String | User full name           |
| email          | String | User email address       |
| mobileNumber   | String | Registered mobile number |
| profilePicture | String | Profile image URL        |
| userType       | String | User role/type           |
| totalCompanies | Number | Total linked companies   |

### Authentication

**Required:** Yes

```http
Authorization: Bearer <JWT_TOKEN>
```

### Success Message

```text
User profile fetched successfully
```

---

## 7. Update User Profile API

### Endpoint

```http
PUT /api/users/profile
```

### Description

This endpoint is used to update the profile details of the authenticated user.

The user can update:

* Name
* Email
* Profile Picture

### Request Body

```json
{
  "name": "Raushan Pandey",
  "email": "raushanpandey845425@gmail.com",
  "profilePicture": "https://example.com/avatar.jpg"
}
```

### Success Response

```json
{
  "statusCode": 200,
  "data": {
    "name": "Raushan Pandey",
    "email": "raushanpandey845425@gmail.com",
    "mobileNumber": "6202579799",
    "profilePicture": "https://example.com/avatar.jpg",
    "userType": "broker",
    "totalCompanies": 0
  },
  "message": "Profile updated successfully",
  "success": true
}
```

### Response Fields

| Field          | Type   | Description              |
| -------------- | ------ | ------------------------ |
| name           | String | User full name           |
| email          | String | User email address       |
| mobileNumber   | String | Registered mobile number |
| profilePicture | String | Profile image URL        |
| userType       | String | User role/type           |
| totalCompanies | Number | Total linked companies   |

### Authentication

**Required:** Yes

```http
Authorization: Bearer <JWT_TOKEN>
```

---


# Common Response Structure

All APIs follow the standard response format shown below:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Operation completed successfully",
  "success": true
}
```

### Standard Response Fields

| Field      | Type    | Description                     |
| ---------- | ------- | ------------------------------- |
| statusCode | Number  | HTTP status code                |
| data       | Object  | API response payload            |
| message    | String  | Human-readable response message |
| success    | Boolean | Operation status                |

```
```


# 🏢 Company Management APIs

---

# 1. Create Company API

## Endpoint

```http
POST /api/companies
```

## Description

This API is used to create a new company profile for the authenticated user.

The company is automatically linked with the logged-in user as the company owner.

### Features

* Company Basic Details
* Business Information
* Industry Selection
* Company Address
* Website Information
* Company Description

### Important Updates

* `industry` is now mandatory.
* `industry` must be a valid MongoDB ObjectId.
* Frontend must send the Industry ID selected from the dropdown.
* Response returns a populated Industry object.

---

## Request Body

| Field              | Type              | Required   | Description                  |
| ------------------ | ----------------- | ---------- | ---------------------------- |
| name               | string            | ✅ Required | Company name                 |
| email              | string            | ✅ Required | Company email                |
| registrationNumber | string            | ✅ Required | Business registration number |
| industry           | string (ObjectId) | ✅ Required | Industry MongoDB ID          |
| website            | string            | ❌ Optional | Company website              |
| description        | string            | ❌ Optional | Company description          |
| address.street     | string            | ❌ Optional | Street address               |
| address.city       | string            | ❌ Optional | City                         |
| address.state      | string            | ❌ Optional | State                        |
| address.postalCode | string            | ❌ Optional | Postal code                  |
| address.country    | string            | ❌ Optional | Country                      |

---

## Example Request

```json
{
  "name": "Pravisti Agro Limiteds",
  "email": "contact@pravistiagrso.com",
  "registrationNumber": "REG-87291sA",
  "industry": "64bcde95a2b3c4d5e6f7a8b9",
  "website": "https://www.pravistiagro.com",
  "description": "Premium quality agricultural trading and logistics.",
  "address": {
    "street": "102, Commercial Hub, SG Highway",
    "city": "Ahmedabad",
    "state": "Gujarat",
    "postalCode": "380054",
    "country": "India"
  }
}
```

---

## Success Response

```json
{
  "statusCode": 201,
  "data": {
    "message": "Company created successfully",
    "company": {
      "name": "Pravisti Agro Limiteds",
      "email": "contact@pravistiagrso.com",
      "phone": "6202579799",
      "address": {
        "street": "102, Commercial Hub, SG Highway",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "postalCode": "380054",
        "country": "India"
      },
      "type": "broker",
      "registrationNumber": "REG-87291sA",
      "industry": {
        "_id": "64bcde95a2b3c4d5e6f7a8b9",
        "name": "Agriculture",
        "description": "Premium quality agricultural trading and logistics.",
        "status": "active"
      },
      "owner": "6a0aa7c3eea1f97b7aa3e178",
      "employees": [],
      "status": "active",
      "isVerified": true,
      "website": "https://www.pravistiagro.com",
      "description": "Premium quality agricultural trading and logistics.",
      "_id": "6a0d4c4ed910a0dc93ad60f9",
      "createdAt": "2026-05-20T05:53:18.405Z",
      "updatedAt": "2026-05-20T05:53:18.405Z"
    }
  },
  "message": "Company created successfully",
  "success": true
}
```

---

## Validation Rules

| Rule                       | Description                                    |
| -------------------------- | ---------------------------------------------- |
| Industry Required          | Company cannot be created without industry     |
| Industry Must Exist        | Valid Industry ID required                     |
| Unique Company Name        | Duplicate company names are not allowed        |
| Unique Email               | Duplicate company emails are not allowed       |
| Unique Registration Number | Duplicate registration numbers are not allowed |

---

## Response Codes

| Status Code | Meaning                                 |
| ----------- | --------------------------------------- |
| 201         | Company created successfully            |
| 400         | Validation error / Industry is required |
| 401         | Unauthorized                            |
| 404         | Industry not found                      |
| 409         | Company already exists                  |
| 500         | Internal server error                   |

---

# 2. Get Companies API

## Endpoint

```http
GET /api/companies
```

## Description

This endpoint is used to fetch all companies linked with the authenticated user.

The API returns:

* All companies created by the logged-in user
* Business information
* Company address
* Owner details
* Verification status
* Company status

The response also includes the total number of companies fetched.

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "count": 1,
    "companies": [
      {
        "address": {
          "street": "102, Commercial Hub, SG Highway",
          "city": "Ahmedabad",
          "state": "Gujarat",
          "postalCode": "380054",
          "country": "India"
        },
        "_id": "6a0d731f81e9215467e6d2c6",
        "name": "Pravisti Agro Limiteds",
        "email": "contact@pravistiagrso.com",
        "phone": "7061901464",
        "type": "trader",
        "registrationNumber": "REG-87291sA",
        "industry": "Agriculture",
        "owner": {
          "_id": "6a0d72db81e9215467e6d2af",
          "name": "monikaaaa",
          "mobileNumber": "7061901464"
        },
        "employees": [],
        "status": "active",
        "isVerified": true,
        "verifiedAt": "2026-05-20T08:38:55.407Z",
        "verifiedBy": null,
        "website": "https://www.pravistiagro.com",
        "description": "Premium quality agricultural trading and logistics.",
        "logo": null,
        "documents": [],
        "createdAt": "2026-05-20T08:38:55.410Z",
        "updatedAt": "2026-05-20T08:38:55.410Z",
        "__v": 0
      }
    ]
  },
  "message": "Companies fetched successfully",
  "success": true
}
```

---

## Response Fields

| Field     | Type   | Description              |
| --------- | ------ | ------------------------ |
| count     | Number | Total companies returned |
| companies | Array  | List of company records  |

---

# 3. Get Company by ID API

## Endpoint

```http
GET /api/companies/:id
```

### Example Endpoint

```http
GET http://localhost:8080/api/companies/6a26b626b9ea0bd40b88b0c5
```

---

## Description

This API fetches the complete details of a single company profile by its ID, including populated owner and industry information.

---

## Authentication

**Required:** Yes

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "address": {
      "street": "mahal jagatpura , jaipur rajsthan 302017",
      "city": "jaipur",
      "state": "Rajasthan",
      "postalCode": "302017",
      "country": "India"
    },
    "_id": "6a26b626b9ea0bd40b88b0c5",
    "name": "netparam technologies pvt ltd",
    "email": "raushanpandey845425@gmail.com",
    "phone": "+916202579799",
    "type": "trader",
    "registrationNumber": "refgs566",
    "industry": {
      "_id": "6a26b530b9ea0bd40b88af63",
      "name": "Agricluter",
      "description": "ddd",
      "status": "active",
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-06-08T12:27:28.048Z",
      "updatedAt": "2026-06-08T12:27:28.048Z",
      "__v": 0
    },
    "owner": {
      "_id": "6a26b3beb9ea0bd40b88ae44",
      "name": "Raushan pandey",
      "mobileNumber": "7061901464"
    },
    "employees": [],
    "status": "active",
    "isVerified": true,
    "verifiedAt": "2026-06-08T12:31:34.994Z",
    "verifiedBy": null,
    "website": null,
    "description": null,
    "logo": null,
    "isDeleted": false,
    "deletedAt": null,
    "documents": [],
    "createdAt": "2026-06-08T12:31:34.995Z",
    "updatedAt": "2026-06-08T12:31:34.995Z",
    "__v": 0
  },
  "message": "Company fetched successfully",
  "success": true
}
```

---

## Response Fields

| Field | Type | Description |
| --- | --- | --- |
| address | Object | Company address details |
| _id | String | Company ID |
| name | String | Company name |
| email | String | Company email |
| phone | String | Company phone number |
| type | String | Company type (trader / broker) |
| registrationNumber | String | Business registration number |
| industry | Object | Populated industry details |
| owner | Object | Populated owner details |
| status | String | Company status (active / inactive) |
| isVerified | Boolean | Company verification status |

---

# 4. Update Company API

## Endpoint

```http
PUT /api/companies/:id
```

### Example Endpoint

```http
PUT http://localhost:8080/api/companies/6a0d731f81e9215467e6d2c6
```

---

## Description

The authenticated user can update company details such as:

* Company Name
* Email
* Industry
* Website
* Description
* Address Details

Updated information automatically reflects across the platform.

---

## Request Body

```json
{
  "name": "Pravisti Agro Limiteds(UPDATED)",
  "email": "contact@pravistiagrso.com",
  "registrationNumber": "REG-87291sA",
  "industry": "Agriculture",
  "website": "https://www.pravistiagro.com",
  "description": "Premium quality agricultural trading and logistics.",
  "address": {
    "street": "102, Commercial Hub, SG Highway",
    "city": "Ahmedabad",
    "state": "Gujarat",
    "postalCode": "380054",
    "country": "India"
  }
}
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "message": "Company updated successfully",
    "company": {
      "_id": "6a0d731f81e9215467e6d2c6",
      "name": "Pravisti Agro Limiteds(UPDATED)",
      "email": "contact@pravistiagrso.com",
      "phone": "7061901464",
      "type": "trader",
      "registrationNumber": "REG-87291sA",
      "industry": "Agriculture",
      "status": "active",
      "isVerified": true,
      "website": "https://www.pravistiagro.com",
      "description": "Premium quality agricultural trading and logistics.",
      "updatedAt": "2026-05-20T08:44:22.811Z"
    }
  },
  "message": "Company updated successfully",
  "success": true
}
```

---

## Response Codes

| Status Code | Meaning                      |
| ----------- | ---------------------------- |
| 200         | Company updated successfully |
| 400         | Validation error             |
| 401         | Unauthorized                 |
| 404         | Company not found            |
| 409         | Duplicate company data       |
| 500         | Internal server error        |

---

# 5. Delete Company API

## Endpoint

```http
DELETE /api/companies/:id
```

### Example Endpoint

```http
DELETE http://localhost:8080/api/companies/6a0d731f81e9215467e6d2c6
```

---

## Description

This endpoint is used to delete an existing company from the platform.

The authenticated user can remove a company that is no longer required.

### Important Note

Once deleted:

* Company cannot be used for 

 creation.
* Company cannot participate in business operations.
* Company management access is removed.
* Deletion is permanent unless restored through admin intervention.

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "message": "Company deleted successfully"
  },
  "message": "Company deleted successfully",
  "success": true
}
```

---

## Response Codes

| Status Code | Meaning                      |
| ----------- | ---------------------------- |
| 200         | Company deleted successfully |
| 401         | Unauthorized                 |
| 404         | Company not found            |
| 500         | Internal server error        |

---

## Authentication

All Company APIs require authentication.

```http
Authorization: Bearer <JWT_TOKEN>
```


# 🏭 Industries API

---

# 1. Get Industries API

## Endpoint

```http
GET /api/industries
```

---

## Description

This API fetches all active and available industries from the database.

Frontend can use this API to:

* Populate the **Select Industry** dropdown
* Display available business industries
* Filter companies by industry
* Support company registration and onboarding forms

### Important Notes

* Only active industries are returned.
* JWT authentication is required.
* Industries are fetched for authenticated users only.

---

## Headers

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Endpoint Details

| Property     | Value              |
| ------------ | ------------------ |
| Method       | GET                |
| URL          | `/api/industries`  |
| Access Level | Authenticated User |

---

## Example Request

```http
GET /api/industries
```

---

## Success Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a0aa7c3eea1f97b7aa3e178",
      "name": "Agriculture",
      "description": "Farming, cultivation, and logistics",
      "status": "active",
      "isDeleted": false,
      "createdAt": "2026-05-26T12:00:00.000Z",
      "updatedAt": "2026-05-26T12:00:00.000Z",
      "__v": 0
    },
    {
      "_id": "6a0bc72a910a0dc93ad60f99",
      "name": "Chemicals & Processing",
      "description": "Industrial chemical manufacturing",
      "status": "active",
      "isDeleted": false,
      "createdAt": "2026-05-26T12:05:00.000Z",
      "updatedAt": "2026-05-26T12:05:00.000Z",
      "__v": 0
    }
  ]
}
```

---

## Response Fields

### Industry Object

| Field       | Type    | Description                 |
| ----------- | ------- | --------------------------- |
| _id         | String  | Unique Industry ID          |
| name        | String  | Industry name               |
| description | String  | Industry description        |
| status      | String  | Industry status             |
| isDeleted   | Boolean | Soft delete flag            |
| createdAt   | Date    | Industry creation timestamp |
| updatedAt   | Date    | Last update timestamp       |

---

## Frontend Usage

### Frontend should:

1. Fetch industries when the company registration page loads.
2. Store the selected industry's `_id`.
3. Display the industry's `name` in the dropdown.
4. Send the selected `_id` while creating or updating a company.

### Example

| Dropdown Label         | Selected Value           |
| ---------------------- | ------------------------ |
| Agriculture            | 6a0aa7c3eea1f97b7aa3e178 |
| Chemicals & Processing | 6a0bc72a910a0dc93ad60f99 |

---

## Common Integration Flow

```text
Load Registration Form
        ↓
Call GET /api/industries
        ↓
Populate Industry Dropdown
        ↓
User Selects Industry
        ↓
Store Industry _id
        ↓
Send Industry ID in Create Company API
```

---

## Response Codes

| Status Code | Meaning                         |
| ----------- | ------------------------------- |
| 200         | Industries fetched successfully |
| 401         | Unauthorized                    |
| 500         | Internal server error           |

---

## Authentication

This endpoint requires a valid JWT token.

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## Success Message

```text
Industries fetched successfully
```


# 📂 Category Management APIs

---

# 1. Create Category API

## Endpoint

```http
POST /api/categories
```

---

## Description

This endpoint is used to create a new product category for organizing products in the system.

Categories created through this API can later be used while:

* Creating Products
* Creating Deals (Sauda)
* Product Classification
* Inventory Management

---

## Request Fields

| Field       | Type         | Required | Description                                  |
| ----------- | ------------ | -------- | -------------------------------------------- |
| companyId   | String       | ✅ Yes    | Company ID in which category will be created |
| name        | String       | ✅ Yes    | Category name                                |
| image       | String (URL) | ❌ No     | Category image URL                           |
| description | String       | ❌ No     | Category description                         |

---

## Example Request

```json
{
  "companyId": "6a0d75d181e9215467e6d323",
  "name": "Masala",
  "image": "https://twobrothersindiashop.com/cdn/shop/articles/chana-dal-benefits.png?v=1694585472&width=1024",
  "description": "All grain related products"
}
```

---

## Success Response

```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "userId": "6a0d72db81e9215467e6d2af",
    "companyId": "6a0d75d181e9215467e6d323",
    "name": "Masala",
    "image": "https://twobrothersindiashop.com/cdn/shop/articles/chana-dal-benefits.png?v=1694585472&width=1024",
    "description": "All grain related products",
    "status": "active",
    "_id": "6a0d76f981e9215467e6d3be",
    "createdAt": "2026-05-20T08:55:21.249Z",
    "updatedAt": "2026-05-20T08:55:21.249Z",
    "__v": 0
  }
}
```

---

## Validation Rules

| Rule                   | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| Company Required       | Valid companyId must be provided                        |
| Category Name Required | Category name is mandatory                              |
| Company Must Exist     | Category can only be created inside an existing company |

---

## Response Codes

| Status Code | Meaning                       |
| ----------- | ----------------------------- |
| 201         | Category created successfully |
| 400         | Validation error              |
| 401         | Unauthorized                  |
| 404         | Company not found             |
| 500         | Internal server error         |

---

# 2. Get Categories API

## Endpoint

```http
GET /api/categories?companyId=:companyId
```

### Example Endpoint

```http
GET http://localhost:8080/api/categories?companyId=6a0d784381e9215467e6d3e2
```

---

## Description

This endpoint is used to fetch all product categories linked to a specific company.

The API returns category details such as:

* Category Name
* Category Image
* Description
* Linked Company
* Status
* Creation Date

These categories are later used while creating:

* Products
* Deals (Sauda)

---

## Query Parameters

### Get All Categories

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| companyId | String | ✅ Yes    | Company ID               |
| status    | String | ❌ No     | active / inactive filter |

---

### Get Single Category

| Parameter | Location    | Required | Description |
| --------- | ----------- | -------- | ----------- |
| id        | URL Param   | ✅ Yes    | Category ID |
| companyId | Query Param | ✅ Yes    | Company ID  |

---

## Success Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a0d99a39d433957a8695a62",
      "userId": "6a0d77b581e9215467e6d3c8",
      "companyId": "6a0d784381e9215467e6d3e2",
      "name": "Electronicss",
      "image": "https://example.com/image.jpg",
      "description": "All electronic items",
      "status": "active",
      "createdAt": "2026-05-20T11:23:15.022Z",
      "updatedAt": "2026-05-20T11:23:15.022Z",
      "__v": 0
    },
    {
      "_id": "6a0d922c9d433957a8695a1f",
      "userId": "6a0d77b581e9215467e6d3c8",
      "companyId": "6a0d784381e9215467e6d3e2",
      "name": "Masalasss",
      "image": "https://twobrothersindiashop.com/cdn/shop/articles/chana-dal-benefits.png?v=1694585472&width=1024",
      "description": "All grain related productsss",
      "status": "active",
      "createdAt": "2026-05-20T10:51:24.382Z",
      "updatedAt": "2026-05-20T10:51:24.382Z",
      "__v": 0
    }
  ]
}
```

---

## Response Fields

| Field       | Type   | Description           |
| ----------- | ------ | --------------------- |
| _id         | String | Category ID           |
| userId      | String | Creator User ID       |
| companyId   | String | Linked Company ID     |
| name        | String | Category name         |
| image       | String | Category image URL    |
| description | String | Category description  |
| status      | String | Category status       |
| createdAt   | Date   | Creation timestamp    |
| updatedAt   | Date   | Last update timestamp |

---

## Response Codes

| Status Code | Meaning                         |
| ----------- | ------------------------------- |
| 200         | Categories fetched successfully |
| 401         | Unauthorized                    |
| 404         | Category not found              |
| 500         | Internal server error           |

---

# 3. Get Category by ID API

## Endpoint

```http
GET /api/categories/:id?companyId=:companyId
```

### Example Endpoint

```http
GET http://localhost:8080/api/categories/6a26b75fb9ea0bd40b88b314?companyId=6a26b626b9ea0bd40b88b0c5
```

---

## Description

This endpoint is used to fetch the complete details of a single product category by its ID.

---

## Required Parameters

| Parameter | Location    | Required | Description |
| --------- | ----------- | -------- | ----------- |
| id        | URL Param   | ✅ Yes    | Category ID |
| companyId | Query Param | ✅ Yes    | Company ID  |

---

## Success Response

```json
{
  "success": true,
  "data": {
    "_id": "6a26b75fb9ea0bd40b88b314",
    "userId": "6a26b3beb9ea0bd40b88ae44",
    "companyId": "6a26b626b9ea0bd40b88b0c5",
    "name": "mobile",
    "image": "https://image01-in.oneplus.net/media/202511/06/f96761005541e8715f92bda23561aa89.png?x-amz-process=image/format,webp/quality,Q_80",
    "description": "fff",
    "status": "active",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-06-08T12:36:47.771Z",
    "updatedAt": "2026-06-10T07:16:01.873Z",
    "__v": 0
  }
}
```

---

## Response Fields

| Field | Type | Description |
| --- | --- | --- |
| _id | String | Category ID |
| userId | String | Creator User ID |
| companyId | String | Linked Company ID |
| name | String | Category name |
| image | String | Category image URL |
| description | String | Category description |
| status | String | Category status |
| isDeleted | Boolean | Soft deletion status |
| deletedAt | Date | Deletion timestamp |
| createdAt | Date | Creation timestamp |
| updatedAt | Date | Last update timestamp |

---

## Response Codes

| Status Code | Meaning |
| ----------- | ------- |
| 200 | Category fetched successfully |
| 400 | Validation error / missing parameters |
| 401 | Unauthorized |
| 403 | Forbidden / no permission for company |
| 404 | Category not found |
| 500 | Internal server error |

---

# 4. Update Category API

## Endpoint

```http
PUT /api/categories/:id?companyId=:companyId
```

### Example Endpoint

```http
PUT http://localhost:8080/api/categories/6a1971402c6d6d67d875a9a2?companyId=6a1970a72c6d6d67d875a98e
```

---

## Description

This endpoint is used to update an existing product category.

The user can update:

* Category Name
* Category Image
* Category Description
* Category Status

Updated category information automatically reflects across all linked products and deals.

---

## Request Fields

| Field       | Type         | Required | Description                  |
| ----------- | ------------ | -------- | ---------------------------- |
| name        | String       | ❌ No     | Updated category name        |
| image       | String (URL) | ❌ No     | Updated image URL            |
| description | String       | ❌ No     | Updated category description |
| status      | String       | ❌ No     | active / inactive            |

---

## Required Parameters

| Parameter | Location    | Required | Description |
| --------- | ----------- | -------- | ----------- |
| id        | URL Param   | ✅ Yes    | Category ID |
| companyId | Query Param | ✅ Yes    | Company ID  |

---

## Example Request

```json
{
  "name": "Masala(updated)",
  "image": "https://twobrothersindiashop.com/cdn/shop/articles/chana-dal-benefits.png?v=1694585472&width=1024",
  "description": "All grain related products"
}
```

---

## Success Response

```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "_id": "6a1971402c6d6d67d875a9a2",
    "userId": "6a196e1d2c6d6d67d875a8a9",
    "companyId": "6a1970a72c6d6d67d875a98e",
    "name": "Masala(updated)",
    "image": "https://twobrothersindiashop.com/cdn/shop/articles/chana-dal-benefits.png?v=1694585472&width=1024",
    "description": "All grain related products",
    "status": "active",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-05-29T10:58:08.665Z",
    "updatedAt": "2026-05-29T11:04:27.353Z",
    "__v": 0
  }
}
```

---

## Response Codes

| Status Code | Meaning                       |
| ----------- | ----------------------------- |
| 200         | Category updated successfully |
| 400         | Validation error              |
| 401         | Unauthorized                  |
| 404         | Category not found            |
| 500         | Internal server error         |

---

# 5. Delete Category API

## Endpoint

```http
DELETE /api/categories/:id?companyId=:companyId
```

### Example Endpoint

```http
DELETE http://localhost:8080/api/categories/6a1973712c6d6d67d875a9ec?companyId=6a1970a72c6d6d67d875a98e
```

---

## Description

This endpoint is used to delete an existing product category from the system.

The user can delete categories that are no longer required.

### Important Note

After deletion:

* Category will not appear in category listings.
* Category cannot be used while creating products.
* Category cannot be selected during deal creation.
* Existing references may become unavailable depending on system rules.

---

## Required Parameters

| Parameter | Location    | Required | Description |
| --------- | ----------- | -------- | ----------- |
| id        | URL Param   | ✅ Yes    | Category ID |
| companyId | Query Param | ✅ Yes    | Company ID  |

---

## Success Response

```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

## Response Codes

| Status Code | Meaning                       |
| ----------- | ----------------------------- |
| 200         | Category deleted successfully |
| 401         | Unauthorized                  |
| 404         | Category not found            |
| 500         | Internal server error         |

---

## Authentication

All Category APIs require authentication.

```http
Authorization: Bearer <JWT_TOKEN>
```


# 📁 SubCategory Management APIs

---

# 1. Create SubCategory API

## Endpoint

```http
POST /api/subcategories
```

### Example Endpoint

```http
POST http://localhost:8080/api/subcategories
```

---

## Description

This API is used to create a new subcategory under a specific category.

### Important Rules

* The authenticated user must own the category.
* `userId` is automatically assigned from the JWT token.
* SubCategory name must be unique within the category.
* Soft delete support is enabled.

---

## Request Fields

| Field       | Type              | Required   | Description             |
| ----------- | ----------------- | ---------- | ----------------------- |
| categoryId  | String (ObjectId) | ✅ Required | Parent Category ID      |
| name        | String            | ✅ Required | SubCategory name        |
| description | String            | ❌ Optional | SubCategory description |
| image       | String (URL)      | ❌ Optional | SubCategory image URL   |

---

## Example Request

```json
{
  "categoryId": "6a0d8779f1732529c7e2522b",
  "name": "T-Shirts_new",
  "description": "Men's cotton t-shirts",
  "image": "https://example.com/image.jpg"
}
```

---

## Success Response

```json
{
  "success": true,
  "message": "SubCategory created successfully",
  "data": {
    "userId": "6a0d77b581e9215467e6d3c8",
    "categoryId": "6a0d8779f1732529c7e2522b",
    "name": "T-Shirts_new",
    "image": "https://example.com/image.jpg",
    "description": "Men's cotton t-shirts",
    "status": "active",
    "isDeleted": false,
    "deletedAt": null,
    "_id": "6a11353290acd3117f03d4aa",
    "createdAt": "2026-05-23T05:03:46.643Z",
    "updatedAt": "2026-05-23T05:03:46.643Z",
    "__v": 0
  }
}
```

---

## Validation Rules

| Rule                | Description                                              |
| ------------------- | -------------------------------------------------------- |
| Category Required   | Valid Category ID must be provided                       |
| Category Ownership  | User must own the category                               |
| Unique Name         | SubCategory name must be unique within the same category |
| Soft Delete Enabled | Records are soft deleted instead of permanently removed  |

---

## Response Codes

| Status Code | Meaning                          |
| ----------- | -------------------------------- |
| 201         | SubCategory created successfully |
| 400         | Validation error                 |
| 401         | Unauthorized                     |
| 404         | Category not found               |
| 409         | Duplicate subcategory name       |
| 500         | Internal server error            |

---

# 2. Get All SubCategories By Category ID

## Endpoint

```http
GET /api/subcategories?categoryId=:categoryId
```

### Example Endpoint

```http
GET http://localhost:8080/api/subcategories?categoryId=6a0d8779f1732529c7e2522b
```

---

## Description

This API fetches all subcategories belonging to a specific category.

### Features

* Category-wise filtering
* Populated category response
* Soft delete filtering
* Status-based filtering

### Important Notes

* Only non-deleted subcategories are returned.
* Category details are automatically populated.
* Supports optional status filtering.

---

## Query Parameters

| Parameter  | Type              | Required   | Description       |
| ---------- | ----------------- | ---------- | ----------------- |
| categoryId | String (ObjectId) | ✅ Required | Category ID       |
| status     | String            | ❌ Optional | active / inactive |

---

## Success Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a11353290acd3117f03d4aa",
      "userId": "6a0d77b581e9215467e6d3c8",
      "categoryId": {
        "_id": "6a0d8779f1732529c7e2522b",
        "name": "Masalasss"
      },
      "name": "T-Shirts_new",
      "image": "https://example.com/image.jpg",
      "description": "Men's cotton t-shirts",
      "status": "active",
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-05-23T05:03:46.643Z",
      "updatedAt": "2026-05-23T05:03:46.643Z",
      "__v": 0
    }
  ]
}
```

---

## Response Fields

| Field       | Type        | Description             |
| ----------- | ----------- | ----------------------- |
| _id         | String      | SubCategory ID          |
| userId      | String      | Creator User ID         |
| categoryId  | Object      | Parent Category Details |
| name        | String      | SubCategory Name        |
| image       | String      | Image URL               |
| description | String      | Description             |
| status      | String      | Current Status          |
| isDeleted   | Boolean     | Soft Delete Flag        |
| deletedAt   | Date | Null | Deletion Timestamp      |
| createdAt   | Date        | Creation Date           |
| updatedAt   | Date        | Last Update Date        |

---

## Response Codes

| Status Code | Meaning                            |
| ----------- | ---------------------------------- |
| 200         | SubCategories fetched successfully |
| 401         | Unauthorized                       |
| 404         | Category not found                 |
| 500         | Internal server error              |

---

# 3. Get SubCategory By ID

## Endpoint

```http
GET /api/subcategories/:id
```

### Example Endpoint

```http
GET /api/subcategories/6a1028b9d02000e9e3655451
```

---

## Description

Fetches a single subcategory using its unique ID.

### Important Notes

* The backend automatically resolves the related company ownership.
* Ownership validation is performed internally.
* No `companyId` query parameter is required.

---

## URL Parameters

| Parameter | Location  | Required | Description    |
| --------- | --------- | -------- | -------------- |
| id        | URL Param | ✅ Yes    | SubCategory ID |

---

## Success Response

```json
{
  "success": true,
  "data": {
    "_id": "6a1028b9d02000e9e3655451",
    "userId": "6a0d77b581e9215467e6d3c8",
    "companyId": "6a0d784381e9215467e6d3e2",
    "categoryId": {
      "_id": "6a0d8779f1732529c7e2522b",
      "name": "Masalasss"
    },
    "name": "T-Shirts(updated)",
    "image": "https://example.com/image.jpg",
    "description": "Men's cotton t-shirts",
    "status": "active",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-05-22T09:58:17.008Z",
    "updatedAt": "2026-05-22T10:05:20.656Z",
    "__v": 0
  }
}
```

---

## Response Codes

| Status Code | Meaning                          |
| ----------- | -------------------------------- |
| 200         | SubCategory fetched successfully |
| 401         | Unauthorized                     |
| 404         | SubCategory not found            |
| 500         | Internal server error            |

---

# 4. Update SubCategory API

## Endpoint

```http
PUT /api/subcategories/:id
```

### Example Endpoint

```http
PUT /api/subcategories/6a1028b9d02000e9e3655451
```

---

## Description

Updates an existing subcategory.

### Backend Validations

* Resolves company ownership automatically.
* Validates category ownership if `categoryId` changes.
* Prevents cross-company category mapping.
* No `companyId` query parameter is required.

---

## URL Parameters

| Parameter | Location  | Required | Description    |
| --------- | --------- | -------- | -------------- |
| id        | URL Param | ✅ Yes    | SubCategory ID |

---

## Request Body

```json
{
  "categoryId": "6a0d8779f1732529c7e2522b",
  "name": "T-Shirts(updated)",
  "description": "Men's cotton t-shirts",
  "image": "https://example.com/image.jpg"
}
```

---

## Success Response

```json
{
  "success": true,
  "message": "SubCategory updated successfully",
  "data": {
    "_id": "6a1028b9d02000e9e3655451",
    "userId": "6a0d77b581e9215467e6d3c8",
    "categoryId": "6a0d8779f1732529c7e2522b",
    "name": "T-Shirts(updated)",
    "image": "https://example.com/image.jpg",
    "description": "Men's cotton t-shirts",
    "status": "active",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-05-22T09:58:17.008Z",
    "updatedAt": "2026-05-23T05:14:37.983Z",
    "__v": 0
  }
}
```

---

## Response Codes

| Status Code | Meaning                          |
| ----------- | -------------------------------- |
| 200         | SubCategory updated successfully |
| 400         | Validation error                 |
| 401         | Unauthorized                     |
| 404         | SubCategory not found            |
| 500         | Internal server error            |

---

# 5. Delete SubCategory API (Soft Delete)

## Endpoint

```http
DELETE /api/subcategories/:id
```

### Example Endpoint

```http
DELETE /api/subcategories/6a1028b9d02000e9e3655451
```

---

## Description

Soft deletes an existing subcategory.

### Backend Actions

The backend automatically:

* Resolves company ownership from the subcategory.
* Performs ownership validation.
* Sets `isDeleted = true`.
* Sets `deletedAt` to the current timestamp.

No `companyId` query parameter is required.

---

## URL Parameters

| Parameter | Location  | Required | Description    |
| --------- | --------- | -------- | -------------- |
| id        | URL Param | ✅ Yes    | SubCategory ID |

---

## Success Response

```json
{
  "success": true,
  "message": "SubCategory deleted successfully"
}
```

---

## Response Codes

| Status Code | Meaning                          |
| ----------- | -------------------------------- |
| 200         | SubCategory deleted successfully |
| 401         | Unauthorized                     |
| 404         | SubCategory not found            |
| 500         | Internal server error            |

---

## Authentication

All SubCategory APIs require authentication.

```http
Authorization: Bearer <JWT_TOKEN>
```



# 📏 Unit Management APIs

---

# 1. Get All Units API

## Endpoint

```http id="4b8snh"
GET /api/units
```

### Example Endpoint

```http id="mhk8uo"
GET http://localhost:8080/api/units
```

---

## Description

This API is used to fetch all available measurement units from the system.

Units are commonly used in:

* Product Creation
* Inventory Management
* Deal (Sauda) Management
* Product Display Pages
* Quantity Selection

---

## Features

* Fetch all units
* Filter units by status
* Public API support
* Lightweight response structure

### Important Notes

* This API can be accessed without authentication.
* Authorization header is optional.
* Supports status-based filtering.

---

## Query Parameters

| Parameter | Type   | Required   | Description                                    |
| --------- | ------ | ---------- | ---------------------------------------------- |
| status    | String | ❌ Optional | Filter units by status (`active` / `inactive`) |

---

## Example Request

```http id="t0v8kp"
GET /api/units
```

---

## Success Response

```json id="jlwmus"
{
  "success": true,
  "data": [
    {
      "_id": "6a113a504c43b25c99e28008",
      "name": "liter",
      "shortName": "Lt",
      "type": "liquid",
      "status": "inactive",
      "createdAt": "2026-05-23T05:25:36.453Z",
      "updatedAt": "2026-05-23T05:26:08.134Z",
      "__v": 0
    },
    {
      "_id": "6a0eac4cd59663585920f09c",
      "name": "Kilogram",
      "shortName": "kg",
      "type": "weight",
      "status": "active",
      "createdAt": "2026-05-21T06:55:08.770Z",
      "updatedAt": "2026-05-21T06:55:08.770Z",
      "__v": 0
    }
  ]
}
```

---

## Response Fields

| Field     | Type   | Description            |
| --------- | ------ | ---------------------- |
| _id       | String | Unique Unit ID         |
| name      | String | Full Unit Name         |
| shortName | String | Unit Abbreviation      |
| type      | String | Unit Category          |
| status    | String | Current Status         |
| createdAt | Date   | Creation Timestamp     |
| updatedAt | Date   | Last Updated Timestamp |

---

## Unit Types Examples

| Type     | Example Units                    |
| -------- | -------------------------------- |
| weight   | Kilogram (kg), Gram (g), Ton (t) |
| liquid   | Liter (L), Milliliter (ml)       |
| quantity | Piece (pcs), Dozen               |
| length   | Meter (m), Centimeter (cm)       |

---

# 2. Get Active Units Only

## Endpoint

```http id="t53i4e"
GET /api/units?status=active
```

---

## Description

Fetches only units that are currently marked as active in the system.

Useful for:

* Product Creation Forms
* Deal Creation Forms
* Inventory Entry Screens
* Dropdown Selection Components

---

## Example Request

```http id="n12vij"
GET /api/units?status=active
```

---

## Success Response

```json id="kl1vkq"
{
  "success": true,
  "data": [
    {
      "_id": "6a0eac4cd59663585920f09c",
      "name": "Kilogram",
      "shortName": "kg",
      "type": "weight",
      "status": "active",
      "createdAt": "2026-05-21T06:55:08.770Z",
      "updatedAt": "2026-05-21T06:55:08.770Z",
      "__v": 0
    }
  ]
}
```

---

## Response Codes

| Status Code | Meaning                    |
| ----------- | -------------------------- |
| 200         | Units fetched successfully |
| 500         | Internal server error      |

---

# 3. Get Unit By ID API

## Endpoint

```http id="qv9ybr"
GET /api/units/:id
```

### Example Endpoint

```http id="v0st3v"
GET http://localhost:8080/api/units/65f8a2b3c4d5e6f7a8b9c0d1
```

---

## Description

This API fetches details of a specific unit using its MongoDB ObjectId.

Frontend commonly uses this API for:

* Product Detail Pages
* Inventory Details
* Product Unit Information
* Deal Product Display
* Pre-selected Unit References

---

## Path Parameters

| Parameter | Type              | Required   | Description           |
| --------- | ----------------- | ---------- | --------------------- |
| id        | String (ObjectId) | ✅ Required | Unit MongoDB ObjectId |

---

## Example Request

```http id="fivqeh"
GET /api/units/65f8a2b3c4d5e6f7a8b9c0d1
```

---

## Success Response

```json id="dj2bya"
{
  "success": true,
  "data": {
    "_id": "65f8a2b3c4d5e6f7a8b9c0d1",
    "name": "Kilogram",
    "shortName": "kg",
    "type": "weight",
    "status": "active",
    "createdAt": "2026-05-23T10:47:27.000Z",
    "updatedAt": "2026-05-23T10:47:27.000Z",
    "__v": 0
  }
}
```

---

## Error Response

```json id="2w9fvr"
{
  "success": false,
  "message": "Unit not found"
}
```

---

## Response Fields

| Field     | Type   | Description            |
| --------- | ------ | ---------------------- |
| _id       | String | Unique Unit ID         |
| name      | String | Full Unit Name         |
| shortName | String | Unit Short Name        |
| type      | String | Unit Type              |
| status    | String | Current Status         |
| createdAt | Date   | Creation Timestamp     |
| updatedAt | Date   | Last Updated Timestamp |

---

## Response Codes

| Status Code | Meaning                   |
| ----------- | ------------------------- |
| 200         | Unit fetched successfully |
| 404         | Unit not found            |
| 500         | Internal server error     |

---

## Common Frontend Flow

```text id="7pkzv8"
Load Product Details
        ↓
Receive Unit ID
        ↓
Call GET /api/units/:id
        ↓
Fetch Unit Information
        ↓
Display Unit Name (kg, liter, pcs)
```

---

## Authentication

Authentication is optional for Unit APIs.

```http id="x4hkn7"
Authorization: Bearer <JWT_TOKEN>
```

The API can also be accessed without authentication depending on system configuration.


# 📦 Product Management APIs

---

# 1. Create Product API

## Endpoint

```http
POST /api/products
```

### Example Endpoint

```http
POST http://localhost:8080/api/products
```

---

## Description

This API is used to create a new product.

### Important Rules

* The authenticated user must be the owner of the company (or a broker creating on behalf of the owner).
* The selected category (if provided) must belong to the same company.
* `categoryId` is OPTIONAL. If omitted, the system automatically resolves or creates a default "Other" category.
* If `subCategoryId` is provided, it must also belong to the same company.
* `userId` is automatically assigned from the JWT token.

---

## Request Fields

| Field         | Type              | Required   | Description                      |
| ------------- | ----------------- | ---------- | -------------------------------- |
| companyId     | String (ObjectId) | ✅ Required | Company ID                       |
| categoryId    | String (ObjectId) | ❌ Optional | Category ID (Default: "Other")   |
| unitId        | String (ObjectId) | ✅ Required | Unit ID (kg, litre, piece, etc.) |
| name          | String            | ✅ Required | Product name                     |
| subCategoryId | String (ObjectId) | ❌ Optional | SubCategory ID                   |
| image         | String            | ❌ Optional | Product image URL                |
| description   | String            | ❌ Optional | Product description              |
| hsnCode       | String            | ❌ Optional | Product HSN code                 |
| gstCode       | String            | ❌ Optional | Product GST code                 |

---

## Example Request Body

```json
{
  "companyId": "6a0d784381e9215467e6d3e2",
  "categoryId": "6a0d8779f1732529c7e2522b",
  "unitId": "6a0eac4cd59663585920f09c",
  "name": "Basmati Rice 5kg",
  "hsnCode": "73181510",
  "gstCode": "GST_12"
}
```

---

## Success Response

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "userId": "6a0d77b581e9215467e6d3c8",
    "companyId": "6a0d784381e9215467e6d3e2",
    "categoryId": "6a0d8779f1732529c7e2522b",
    "unitId": "6a0eac4cd59663585920f09c",
    "name": "Basmati Rice 5kg",
    "image": "",
    "description": "",
    "status": "active",
    "hsnCode": "73181510",
    "gstCode": "GST_12",
    "_id": "6a101afda79a62e7dee09028",
    "createdAt": "2026-05-22T08:59:41.461Z",
    "updatedAt": "2026-05-22T08:59:41.461Z",
    "__v": 0
  }
}
```

---

## Validation Rules

| Rule                   | Description                                |
| ---------------------- | ------------------------------------------ |
| Company Required       | Valid companyId must be provided           |
| Category Required      | Valid categoryId must be provided          |
| Unit Required          | Valid unitId must be provided              |
| Company Ownership      | User must own the company                  |
| Category Validation    | Category must belong to same company       |
| SubCategory Validation | SubCategory must belong to same company    |
| Unique Product Name    | Duplicate product names may not be allowed |

---

## Response Codes

| Status Code | Meaning                                    |
| ----------- | ------------------------------------------ |
| 201         | Product created successfully               |
| 400         | Validation error / duplicate product name  |
| 403         | Company access denied                      |
| 404         | Company / Category / SubCategory not found |
| 500         | Internal server error                      |

---

# 2. Get All Products API

## Endpoint

```http
GET /api/products?companyId=:companyId
```

### Example Endpoint

```http
GET http://localhost:8080/api/products?companyId=6a0d784381e9215467e6d3e2
```

---

## Description

This API fetches all products belonging to a specific company.

### Features

* Company-wise filtering
* Category populated response
* Unit populated response
* Category filtering
* SubCategory filtering
* Status filtering

### Important Notes

* The authenticated user must own the company.
* Only products belonging to the same company are returned.

---

## Query Parameters

| Parameter     | Type              | Required   | Description           |
| ------------- | ----------------- | ---------- | --------------------- |
| companyId     | String (ObjectId) | ✅ Required | Company ID            |
| categoryId    | String (ObjectId) | ❌ Optional | Filter by category    |
| subCategoryId | String (ObjectId) | ❌ Optional | Filter by subcategory |
| status        | String            | ❌ Optional | active / inactive     |

---

## Example Requests

### Get All Products

```http
GET /api/products?companyId=6a0d784381e9215467e6d3e2
```

### Get Active Products

```http
GET /api/products?companyId=6a0d784381e9215467e6d3e2&status=active
```

### Get Products By Category

```http
GET /api/products?companyId=6a0d784381e9215467e6d3e2&categoryId=6a0d8779f1732529c7e2522b
```

---

## Success Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a101afda79a62e7dee09028",
      "userId": "6a0d77b581e9215467e6d3c8",
      "companyId": "6a0d784381e9215467e6d3e2",
      "categoryId": {
        "_id": "6a0d8779f1732529c7e2522b",
        "name": "Masalasss",
        "image": "https://twobrothersindiashop.com/cdn/shop/articles/chana-dal-benefits.png?v=1694585472&width=1024"
      },
      "unitId": {
        "_id": "6a0eac4cd59663585920f09c",
        "name": "Kilogram",
        "shortName": "kg",
        "type": "weight"
      },
      "name": "Basmati Rice 5kg",
      "image": "",
      "description": "",
      "status": "active",
      "hsnCode": "73181510",
      "gstCode": "GST_12",
      "createdAt": "2026-05-22T08:59:41.461Z",
      "updatedAt": "2026-05-22T08:59:41.461Z",
      "__v": 0
    }
  ]
}
```

---

## Response Codes

| Status Code | Meaning                                    |
| ----------- | ------------------------------------------ |
| 200         | Products fetched successfully              |
| 400         | companyId missing                          |
| 403         | Company access denied                      |
| 404         | Company / Category / SubCategory not found |
| 500         | Internal server error                      |

---

# 3. Get Active Products API

## Endpoint

```http
GET /api/products?companyId=:companyId&status=active
```

### Example Endpoint

```http
GET http://localhost:8080/api/products?companyId=6a0d784381e9215467e6d3e2&status=active
```

---

## Description

This API fetches all active products belonging to a company.

### Features

* Company-wise filtering
* Active product filtering
* Category populated response
* Unit populated response

### Important Notes

* The authenticated user must own the company.
* Only active products are returned.

---

## Query Parameters

| Parameter | Type              | Required   | Description      |
| --------- | ----------------- | ---------- | ---------------- |
| companyId | String (ObjectId) | ✅ Required | Company ID       |
| status    | String            | ✅ Required | Must be `active` |

---

## Success Response

```json
{
  "success": true,
  "data": [
    {
      "_id": "6a101afda79a62e7dee09028",
      "name": "Basmati Rice 5kg",
      "status": "active",
      "hsnCode": "73181510",
      "gstCode": "GST_12"
    }
  ]
}
```

---

## Response Codes

| Status Code | Meaning                              |
| ----------- | ------------------------------------ |
| 200         | Active products fetched successfully |
| 400         | Invalid request                      |
| 403         | Company access denied                |
| 404         | Company not found                    |
| 500         | Internal server error                |

---

# 4. Update Product API

## Endpoint

```http
PUT /api/products/:id?companyId=:companyId
```

### Example Endpoint

```http
PUT http://localhost:8080/api/products/6a101afda79a62e7dee09028?companyId=6a0d784381e9215467e6d3e2
```

---

## Description

This API updates an existing product.

### Editable Fields

* Product Name
* Category
* SubCategory
* Unit
* Image
* Description
* Status
* HSN Code
* GST Code

### Important Notes

* User must own the company.
* Updated category/subcategory must belong to the same company.

---

## Request Fields

| Field         | Type              | Required   | Description            |
| ------------- | ----------------- | ---------- | ---------------------- |
| name          | String            | ❌ Optional | Updated product name   |
| categoryId    | String (ObjectId) | ❌ Optional | Updated category ID    |
| subCategoryId | String (ObjectId) | ❌ Optional | Updated subcategory ID |
| unitId        | String (ObjectId) | ❌ Optional | Updated unit ID        |
| image         | String            | ❌ Optional | Updated image URL      |
| description   | String            | ❌ Optional | Updated description    |
| status        | String            | ❌ Optional | active / inactive      |
| hsnCode       | String            | ❌ Optional | Updated HSN code       |
| gstCode       | String            | ❌ Optional | Updated GST code       |

---

## Example Request Body

```json
{
  "name": "Basmati Rice 10kg(updated)",
  "image": "https://example.com/rice-updated.png",
  "description": "Updated premium basmati rice pack",
  "status": "inactive",
  "hsnCode": "7c31481510",
  "gstCode": "GST_124"
}
```

---

## Success Response

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "_id": "6a101afda79a62e7dee09028",
    "name": "Basmati Rice 10kg(updated)",
    "image": "https://example.com/rice-updated.png",
    "description": "Updated premium basmati rice pack",
    "status": "inactive",
    "hsnCode": "7c31481510",
    "gstCode": "GST_124",
    "updatedAt": "2026-05-22T09:08:49.325Z"
  }
}
```

---

## Response Codes

| Status Code | Meaning                      |
| ----------- | ---------------------------- |
| 200         | Product updated successfully |
| 400         | Validation error             |
| 403         | Company access denied        |
| 404         | Product not found            |
| 500         | Internal server error        |

---

# 5. Delete Product API

## Endpoint

```http
DELETE /api/products/:id?companyId=:companyId
```

### Example Endpoint

```http
DELETE http://localhost:8080/api/products/6a101afda79a62e7dee09028?companyId=6a0d784381e9215467e6d3e2
```

---

## Description

This API deletes an existing product from the system.

### Important Notes

* The authenticated user must own the company.
* Deleted products will no longer be available for deal creation or inventory management.

---

## URL Parameters

| Parameter | Location    | Required | Description |
| --------- | ----------- | -------- | ----------- |
| id        | URL Param   | ✅ Yes    | Product ID  |
| companyId | Query Param | ✅ Yes    | Company ID  |

---

## Success Response

```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Response Codes

| Status Code | Meaning                      |
| ----------- | ---------------------------- |
| 200         | Product deleted successfully |
| 403         | Company access denied        |
| 404         | Product not found            |
| 500         | Internal server error        |

---

## Authentication

All Product APIs require authentication.

```http
Authorization: Bearer <JWT_TOKEN>
```




# 📱 Contact Sync & Contact Discovery APIs

---

# 1. Filter Contacts API

## Endpoint

```http
POST /api/contacts/filter
```

---

## Description

This API is used to sync and analyze a user's mobile contacts on the Pravisti platform.

The frontend sends a list of mobile contacts, and the backend:

* Identifies registered Pravisti users
* Finds users with registered companies
* Detects users without company setup
* Detects unregistered contacts
* Generates WhatsApp invite/reminder links
* Returns company information for Deal (Sauda) creation

### Business Use Cases

* Contact Sync
* Business Networking
* Deal Creation
* Company Discovery
* User Onboarding Automation
* WhatsApp Invite Flow

---

## Features

* Mobile number normalization
* Batch user matching
* Company discovery
* WhatsApp invite generation
* Registered user detection
* Company ownership discovery

### Important Notes

* JWT authentication is required.
* Only authenticated users can access this API.
* Mobile numbers are normalized internally before matching.

---

## Request Fields

| Field            | Type   | Required   | Description             |
| ---------------- | ------ | ---------- | ----------------------- |
| contacts         | Array  | ✅ Required | List of mobile contacts |
| contacts[].name  | String | ❌ Optional | Contact name            |
| contacts[].phone | String | ✅ Required | Contact mobile number   |

---

## Example Request

```json
{
  "contacts": [
    {
      "phone": "+916202579799"
    },
    {
      "phone": "+917061901464"
    }
  ]
}
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": [
    {
      "phone": "+916202579799",
      "isRegistered": true,
      "hasCompany": false,
      "userId": "6a196e782c6d6d67d875a8b6",
      "registeredName": "Raushan",
      "profilePicture": null,
      "whatsappInviteLink": "https://wa.me/?text=Hi%20there%2C%20please%20register%20your%20company%20on%20Pravisti%20so%20we%20can%20do%20deals%20together!%20Download%20the%20app%3A%20https%3A%2F%2Fpravisti.com%2Fdownload"
    },
    {
      "phone": "+917061901464",
      "isRegistered": true,
      "hasCompany": true,
      "userId": "6a196e1d2c6d6d67d875a8a9",
      "registeredName": "Raushan",
      "profilePicture": null,
      "companies": [
        {
          "companyId": "6a19700c2c6d6d67d875a965",
          "companyName": "Pravisti Agro Limiteds(updated)",
          "companyType": "trader",
          "logo": null,
          "owner": {
            "userId": "6a196e1d2c6d6d67d875a8a9",
            "name": "Raushan",
            "mobileNumber": "7061901464"
          }
        }
      ]
    }
  ],
  "message": "Contacts filtered successfully",
  "success": true
}
```

---

## Response Fields

### Contact Result Object

| Field              | Type          | Description                                         |
| ------------------ | ------------- | --------------------------------------------------- |
| phone              | String        | Contact mobile number                               |
| isRegistered       | Boolean       | Indicates whether contact is registered             |
| hasCompany         | Boolean       | Indicates whether user owns or belongs to a company |
| userId             | String        | Registered user ID                                  |
| registeredName     | String        | User's registered name                              |
| profilePicture     | String | Null | User profile image                                  |
| whatsappInviteLink | String        | WhatsApp onboarding link                            |
| companies          | Array         | Associated companies                                |

---

## Contact Classification

The API automatically classifies contacts into:

| Category                        | Description                                  |
| ------------------------------- | -------------------------------------------- |
| Registered User + Company       | User exists and owns/has access to companies |
| Registered User Without Company | User exists but has not created a company    |
| Unregistered Contact            | User not found in Pravisti                   |
| Company Associated Contact      | Contact linked to one or more companies      |

---

## Response Codes

| Status Code | Meaning                        |
| ----------- | ------------------------------ |
| 200         | Contacts filtered successfully |
| 400         | Invalid contacts payload       |
| 401         | Unauthorized                   |
| 500         | Internal server error          |

---

# 2. Get Companies By Mobile Number API

## Endpoint

```http
GET /api/contacts/companies-by-number
```

---

## Description

This API fetches all companies associated with a specific mobile number.

The system searches through:

* Company owner mobile numbers
* Company employee mobile numbers
* Direct company phone numbers

This API is useful for discovering companies before creating a Deal (Sauda).

---

## Features

* Company lookup by mobile number
* Owner search
* Employee search
* Company phone search
* Mobile number normalization

### Important Notes

* JWT authentication is required.
* Only authenticated users can access this API.
* Mobile numbers are normalized internally before matching.

---

## Query Parameters

| Parameter    | Type   | Required   | Description           |
| ------------ | ------ | ---------- | --------------------- |
| mobileNumber | String | ✅ Required | Contact mobile number |

---

## Example Request

```http
GET http://localhost:8080/api/contacts/companies-by-number?mobileNumber=+916202579799
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": [
    {
      "companyId": "6a1970a72c6d6d67d875a98e",
      "companyName": "Nextcoreai",
      "contactPersonName": "Raushan",
      "mobileNumber": "917061901464",
      "companyType": "trader"
    },
    {
      "companyId": "6a19700c2c6d6d67d875a965",
      "companyName": "Pravisti Agro Limiteds(updated)",
      "contactPersonName": "Raushan",
      "mobileNumber": "917061901464",
      "companyType": "trader"
    }
  ],
  "message": "Companies fetched successfully",
  "success": true
}
```

---

## Response Fields

| Field             | Type   | Description            |
| ----------------- | ------ | ---------------------- |
| companyId         | String | Company ID             |
| companyName       | String | Company name           |
| contactPersonName | String | Primary contact person |
| mobileNumber      | String | Contact mobile number  |
| companyType       | String | Company type           |

---

## Common Frontend Flow

```text
User Selects Contact
          ↓
Read Mobile Number
          ↓
Call GET /contacts/companies-by-number
          ↓
Fetch Associated Companies
          ↓
Display Company List
          ↓
Select Company
          ↓
Create Deal (Sauda)
```

---

## Response Codes

| Status Code | Meaning                        |
| ----------- | ------------------------------ |
| 200         | Companies fetched successfully |
| 400         | Mobile number is required      |
| 401         | Unauthorized                   |
| 404         | No companies found             |
| 500         | Internal server error          |

---

## Authentication

All Contact APIs require authentication.

```http
Authorization: Bearer <JWT_TOKEN>
```

---

## Common Response Structure

```json
{
  "statusCode": 200,
  "data": [],
  "message": "Operation completed successfully",
  "success": true
}
```


# 🤝 Deal (Sauda) Management APIs

---

# 1. Create Deal API

## Endpoint

```http
POST /api/deals
```

### Example Endpoint

```http
POST http://localhost:8080/api/deals
```

---

## Description

This API is used to create a new business deal (Sauda) between companies.

The authenticated user can create deals as:

* Seller
* Buyer
* Broker

### Features

* Multiple Products Support
* GST Calculations
* Discount Management
* Payment Terms
* Deal Expiry Management
* Multi-Party Approval Workflow

---

## Authentication

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Request Fields

| Field           | Type             | Required   | Description                  |
| --------------- | ---------------- | ---------- | ---------------------------- |
| role            | String           | ✅ Required | seller / buyer / broker      |
| myCompanyId     | String(ObjectId) | ❌ Optional | Required when role is broker |
| sellerCompanyId | String(ObjectId) | ✅ Required | Seller company ID            |
| buyerCompanyId  | String(ObjectId) | ✅ Required | Buyer company ID             |
| products        | Array            | ✅ Required | Product list                 |
| expiryDate      | Date             | ✅ Required | Deal expiry date             |
| notes           | String           | ❌ Optional | Additional remarks           |

---

## Product Object Structure

| Field        | Type             | Required   | Description      |
| ------------ | ---------------- | ---------- | ---------------- |
| productId    | String(ObjectId) | ✅ Required | Product ID       |
| quantity     | Number           | ✅ Required | Product quantity |
| price        | Number           | ✅ Required | Product price    |
| gst          | Number           | ❌ Optional | GST percentage   |
| discount     | Number           | ❌ Optional | Discount amount  |
| paymentTerms | String           | ❌ Optional | Payment terms    |

---

## Example Request

```json
{
  "role": "seller",
  "sellerCompanyId": "6a0d784381e9215467e6d3e2",
  "buyerCompanyId": "6a0d75d181e9215467e6d323",
  "products": [
    {
      "productId": "6a103df22516b1294d111fdf",
      "quantity": 2,
      "price": 100,
      "gst": 18,
      "discount": 20,
      "paymentTerms": "100% Advance"
    }
  ],
  "expiryDate": "2026-06-27T12:00:00.000Z",
  "notes": "Seller created a deal."
}
```

---

# Deal Approval Workflow

### Seller Creates Deal

```json
{
  "approvalStatus": {
    "seller": "approved",
    "buyer": "pending"
  }
}
```

### Buyer Creates Deal

```json
{
  "approvalStatus": {
    "buyer": "approved",
    "seller": "pending"
  }
}
```

### Workflow Rules

* Creator company is automatically approved.
* Creator does not need to approve again.
* Remaining participants remain pending.
* Deal stays pending until all approvals are completed.
* Any rejection immediately marks the deal as rejected.
* Once all approvals are completed, deal becomes approved.

---

## Success Response

```json
{
  "statusCode": 201,
  "data": {
    "deal": {
      "_id": "6a1e9759fc59ef1fa6e41e98",
      "dealNumber": "DEAL-0007",
      "role": "seller",
      "status": "pending",
      "totalAmount": 148167.6
    }
  },
  "message": "Deal created successfully",
  "success": true
}
```

---

## Response Codes

| Status | Meaning                   |
| ------ | ------------------------- |
| 201    | Deal created successfully |
| 400    | Validation error          |
| 401    | Unauthorized              |
| 403    | Permission denied         |
| 404    | Company not found         |
| 500    | Server error              |

---

# 2. Get User Deals API

## Endpoint

```http
GET /api/deals
```

---

## Description

Returns all deals associated with the authenticated user's companies.

Supported Roles:

* Buyer
* Seller
* Broker

### Features

* Deal Listing
* Pagination
* Company Filtering
* Approval Tracking
* Payment Tracking
* Financial Summary
* Viewer Permissions

---

## Query Parameters

| Parameter | Type             | Required   | Description       |
| --------- | ---------------- | ---------- | ----------------- |
| companyId | String(ObjectId) | ❌ Optional | Filter by company |
| page      | Number           | ❌ Optional | Default 1         |
| limit     | Number           | ❌ Optional | Default 10        |

---

## Example Requests

### Get All Deals

```http
GET /api/deals
```

### Get Company Deals

```http
GET /api/deals?companyId=COMPANY_ID
```

### Pagination

```http
GET /api/deals?page=1&limit=10
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "deals": [],
    "pagination": {
      "total": 7,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  },
  "message": "User deals fetched successfully",
  "success": true
}
```

---

# 3. Get Expired Deals API

## Endpoint

```http
GET /api/deals/expired
```

---

## Description

This API returns all expired deals associated with the authenticated user's companies.

### Features

* Deal Listing
* Pagination
* Company Filtering

---

## Query Parameters

| Parameter | Type             | Required   | Description       |
| --------- | ---------------- | ---------- | ----------------- |
| companyId | String(ObjectId) | ❌ Optional | Filter by company |
| page      | Number           | ❌ Optional | Default 1         |
| limit     | Number           | ❌ Optional | Default 10        |

---

## Example Request

```http
GET /api/deals/expired?page=1&limit=10
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "deals": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "limit": 10,
      "pages": 0
    }
  },
  "message": "Expired deals fetched successfully",
  "success": true
}
```

---

## Response Fields

| Field | Type | Description |
| --- | --- | --- |
| deals | Array | List of expired deal records |
| pagination | Object | Pagination details |

---

# 4. Get Deal By ID API

## Endpoint

```http
GET /api/deals/:id
```

### Example

```http
GET /api/deals/6a1d6aad18c735096642ec4d
```

---

## Description

Returns complete details of a single deal including:

* Products
* Companies
* Approval Status
* Payment History
* Delivery Information
* Viewer Permissions
* Financial Summary

---

# Viewer Information

These fields are calculated by backend for currently logged-in user.

| Field                | Description                          |
| -------------------- | ------------------------------------ |
| viewerRole           | Role of current viewer               |
| currentUserRole      | Current user's role                  |
| viewerApprovalStatus | Current approval status              |
| canApprove           | Show approve button                  |
| canReject            | Show reject button                   |
| pendingApprovalFor   | Next participant expected to approve |
| createdByRole        | Role of the deal creator (seller/buyer/broker) |

---

## Frontend Integration

### Show Buttons

```javascript
const showApproveButton = deal.canApprove;
const showRejectButton = deal.canReject;
```

### DO NOT USE

```javascript
deal.role
deal.approvalStatus.buyer
deal.approvalStatus.seller
```

Backend already provides:

```javascript
deal.canApprove
deal.canReject
```

---

# Deal Status Values

| Status    | Description             |
| --------- | ----------------------- |
| pending   | Waiting for approvals   |
| approved  | Fully approved          |
| rejected  | Rejected by participant |
| completed | Successfully completed  |
| expired   | Deal expired            |

---

# Approval Status Values

| Value    | Description          |
| -------- | -------------------- |
| pending  | Waiting for approval |
| approved | Approved             |
| rejected | Rejected             |

---

# acceptedBy Values

| Value    | Description        |
| -------- | ------------------ |
| pending  | Waiting for action |
| accepted | Approved           |
| rejected | Rejected           |

---

# Financial Summary

| Field          | Description          |
| -------------- | -------------------- |
| totalSubtotal  | Product subtotal     |
| totalDiscount  | Total discount       |
| totalGSTAmount | GST amount           |
| grandTotal     | Final amount         |
| totalAmount    | Total payable amount |

---

# Payment Information

| Field                 | Description              |
| --------------------- | ------------------------ |
| dealAmount            | Total deal amount        |
| role                  | Financial role           |
| amountSent            | Amount paid              |
| amountReceived        | Amount received          |
| amountSentOrReceived  | Total transaction amount |
| remainingAmount       | Outstanding balance      |
| progressBarPercentage | Payment progress         |
| historyTimeline       | Payment history          |

---

# 5. Update Deal Status API

## Endpoint

```http
PATCH /api/deals/:id/status
```

---

## Description

Updates deal approval status.

The backend automatically:

* Detects logged-in user
* Identifies Buyer/Seller/Broker role
* Updates approval status
* Updates acceptedBy
* Recalculates overall deal status
* Returns updated viewer permissions

---

## Approve Deal

```json
{
  "status": "approved"
}
```

---

## Reject Deal

```json
{
  "status": "rejected"
}
```

---

## Optional Role Specific Approval

```json
{
  "approvalType": "buyer",
  "approvalStatus": "approved"
}
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "status": "approved",
    "viewerRole": "buyer",
    "viewerApprovalStatus": "approved",
    "canApprove": false,
    "canReject": false
  },
  "message": "Deal approval status updated successfully",
  "success": true
}
```

---

# Approval Workflow Example

### Seller Creates Deal

```json
{
  "approvalStatus": {
    "seller": "approved",
    "buyer": "pending"
  }
}
```

### Buyer Approves

```json
{
  "approvalStatus": {
    "seller": "approved",
    "buyer": "approved"
  },
  "status": "approved"
}
```

### Buyer Rejects

```json
{
  "approvalStatus": {
    "seller": "approved",
    "buyer": "rejected"
  },
  "status": "rejected"
}
```

---

# Pagination Structure

| Field | Description      |
| ----- | ---------------- |
| total | Total records    |
| page  | Current page     |
| limit | Records per page |
| pages | Total pages      |

---

# Error Responses

| Status Code | Description           |
| ----------- | --------------------- |
| 200         | Success               |
| 400         | Validation error      |
| 401         | Unauthorized          |
| 403         | Access denied         |
| 404         | Deal not found        |
| 500         | Internal server error |

---

## Authentication

All Deal APIs require authentication.

```http
Authorization: Bearer <JWT_TOKEN>
```




# 📨 Deal Invitation APIs

---

# 1. Invite Deal API

## Endpoint

```http id="v3jk2o"
POST /api/contacts/invite-deal
```

---

## Description

This API is used to create a Deal Draft Invitation and send an invite to a contact through WhatsApp.

This endpoint is specifically designed for contacts who are not yet registered on the Pravisti platform.

The system:

* Creates a temporary deal draft
* Stores the invitation
* Generates an invite code
* Generates WhatsApp invite text
* Returns a WhatsApp sharing URL

Once the receiver:

1. Registers on Pravisti
2. Creates a company

The pending invitation is automatically converted into an active deal and becomes visible on both users' dashboards.

---

## Features

* Deal Draft Creation
* Invite Code Generation
* WhatsApp Share Link Generation
* Automatic Deal Activation After Registration
* Product Validation
* Contact-Based Deal Initiation

---

## Important Notes

* JWT authentication is required.
* Sender company is automatically identified from the logged-in user.
* Product IDs must belong to the sender company.

---

## Authentication

```http id="1f1z1s"
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Request Fields

| Field                 | Type   | Required   | Description             |
| --------------------- | ------ | ---------- | ----------------------- |
| receiverMobileNumber  | String | ✅ Required | Receiver mobile number  |
| receiverName          | String | ❌ Optional | Receiver name           |
| dealDraft             | Object | ✅ Required | Draft deal information  |
| dealDraft.role        | String | ✅ Required | seller / buyer / broker |
| dealDraft.products    | Array  | ✅ Required | Product list            |
| dealDraft.totalAmount | Number | ✅ Required | Total deal amount       |
| dealDraft.discount    | Number | ❌ Optional | Overall discount        |
| dealDraft.expiryDate  | Date   | ✅ Required | Invitation expiry date  |
| dealDraft.notes       | String | ❌ Optional | Additional notes        |

---

## Product Object Structure

| Field        | Type             | Required   | Description          |
| ------------ | ---------------- | ---------- | -------------------- |
| productId    | String(ObjectId) | ✅ Required | Product ID           |
| quantity     | Number           | ✅ Required | Product quantity     |
| price        | Number           | ✅ Required | Product price        |
| paymentTerms | String           | ❌ Optional | Payment terms        |
| discount     | Number           | ❌ Optional | Product discount     |
| totalAmount  | Number           | ✅ Required | Product total amount |

---

## Example Request

```json id="xycf40"
{
  "receiverMobileNumber": "7061901464",
  "receiverName": "Ramesh Kumar",
  "dealDraft": {
    "role": "seller",
    "products": [
      {
        "productId": "6a103df22516b1294d111fdf",
        "quantity": 50,
        "price": 10,
        "paymentTerms": "Cash on Delivery",
        "discount": 0,
        "totalAmount": 500
      }
    ],
    "totalAmount": 500,
    "discount": 0,
    "expiryDate": "2026-06-25T12:00:00.000Z",
    "notes": "Bulk Samosa delivery request"
  }
}
```

---

## Success Response

```json id="6ys32g"
{
  "statusCode": 201,
  "data": {
    "inviteCode": "633CD6A8",
    "whatsappUrl": "https://wa.me/7061901464",
    "inviteText": "Hi Ramesh Kumar, join me on Pravisti..."
  },
  "message": "Deal draft invitation created successfully",
  "success": true
}
```

---

## Invitation Lifecycle

```text id="vvp4gq"
Create Deal Invitation
          ↓
Generate Invite Code
          ↓
Send WhatsApp Link
          ↓
Receiver Registers
          ↓
Receiver Creates Company
          ↓
Draft Converted To Deal
          ↓
Deal Appears On Both Dashboards
```

---

## Invitation Status Values

| Status    | Description                           |
| --------- | ------------------------------------- |
| pending   | Waiting for receiver registration     |
| accepted  | Invitation converted into active deal |
| expired   | Invitation validity expired           |
| cancelled | Invitation manually cancelled         |

---

## Response Codes

| Status Code | Meaning                             |
| ----------- | ----------------------------------- |
| 201         | Invitation created successfully     |
| 400         | Validation error                    |
| 401         | Unauthorized                        |
| 403         | Product ownership validation failed |
| 404         | Product not found                   |
| 500         | Internal server error               |

---

# 2. Get Pending Deal Invitations API

## Endpoint

```http id="f2xmq5"
GET /api/contacts/invitations/pending
```

### Example Endpoint

```http id="imx4z3"
GET http://localhost:8080/api/contacts/invitations/pending
```

---

## Description

This API fetches all pending deal draft invitations created by the authenticated user.

The API returns:

* Receiver information
* Draft deal details
* Product information
* Invite codes
* Invitation metadata

---

## Important Notes

* JWT authentication is required.
* Only pending invitations are returned.
* Product details are automatically populated.

---

## Success Response

```json id="b9du1m"
{
  "statusCode": 200,
  "data": [
    {
      "_id": "6a141542511b5b0bccc77367",
      "receiverName": "Ramesh Kumar",
      "receiverMobileNumber": "7061901464",
      "status": "pending",
      "inviteCode": "633CD6A8",
      "dealDraft": {
        "role": "seller",
        "totalAmount": 500
      }
    }
  ],
  "message": "Pending deal invitations fetched successfully",
  "success": true
}
```

---

## Response Fields

### Invitation Object

| Field                  | Type   | Description             |
| ---------------------- | ------ | ----------------------- |
| _id                    | String | Invitation ID           |
| senderUserId           | String | Sender User ID          |
| senderCompanyId        | String | Sender Company ID       |
| receiverName           | String | Receiver name           |
| receiverMobileNumber   | String | Receiver mobile number  |
| normalizedMobileNumber | String | Normalized phone number |
| inviteCode             | String | Unique invitation code  |
| status                 | String | Invitation status       |
| dealDraft              | Object | Draft deal information  |
| createdAt              | Date   | Creation timestamp      |
| updatedAt              | Date   | Last updated timestamp  |

---

## Frontend Usage

### Pending Invitations Screen

Display:

* Receiver Name
* Mobile Number
* Invite Code
* Deal Amount
* Deal Expiry Date
* Product Information
* Invitation Status

---

## Common Frontend Flow

```text id="hdmk3e"
Open Pending Invitations
            ↓
Call GET /invitations/pending
            ↓
Fetch Draft Invitations
            ↓
Display Invite Details
            ↓
Track Registration Status
            ↓
Auto Convert To Deal
```

---

## Response Codes

| Status Code | Meaning                                  |
| ----------- | ---------------------------------------- |
| 200         | Pending invitations fetched successfully |
| 401         | Unauthorized user                        |
| 404         | No pending invitations found             |
| 500         | Internal server error                    |

---

## Authentication

All Invitation APIs require authentication.

```http id="j7q8zh"
Authorization: Bearer <JWT_TOKEN>
```

---

## Common Response Structure

```json id="rf18hr"
{
  "statusCode": 200,
  "data": [],
  "message": "Operation completed successfully",
  "success": true
}
```


# 🔄 Recreated Deal APIs

---

# 1. Recreate Deal API

## Endpoint

```http
POST /api/deals/:id/recreate
```

### Example Endpoint

```http
POST /api/deals/6a1aa481e2cdd435681760d0/recreate
```

---

## Description

This API allows the original creator of an expired deal to create a new deal using the details of the expired deal.

The system automatically:

* Copies products
* Copies pricing
* Copies GST details
* Copies discounts
* Copies counterparties
* Copies deal structure
* Generates a new deal number
* Resets approval workflow
* Creates a new pending deal

The recreated deal maintains a reference to the original expired deal using `linkedDealId`.

---

## Authentication

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## URL Parameters

| Parameter | Type              | Required   | Description     |
| --------- | ----------------- | ---------- | --------------- |
| id        | String (ObjectId) | ✅ Required | Expired Deal ID |

---

## Example Request

### Recreate Using Existing Data

```http
POST /api/deals/6a1aa481e2cdd435681760d0/recreate
```

### Recreate With Updated Product Data

```json
{
  "notes": "Recreated DEAL-0003 with updated rice price and quantity by original seller",
  "products": [
    {
      "productId": "6a19767b2c6d6d67d875aa66",
      "quantity": 5,
      "price": 115,
      "gst": 18,
      "discount": 5,
      "paymentTerms": "100% Advance"
    }
  ]
}
```

---

## Business Rules

### Expired Deal Validation

Only deals with status:

```text
expired
```

can be recreated.

Otherwise:

```http
400 Bad Request
```

---

### Authorization Rules

Only:

* Original deal creator
* Authorized company representative

can recreate a deal.

Otherwise:

```http
403 Forbidden
```

---

### Product Mapping

If products are not provided:

* Product IDs are copied
* Quantity is copied
* Price is copied
* GST is copied
* Discount is copied
* Payment Terms are copied

from the original expired deal.

---

### Company Mapping

The system automatically determines:

* Buyer Company
* Seller Company
* Broker Company (if applicable)

from the original deal.

---

### Expiry Date Calculation

If expiry date is not supplied:

* Original validity duration is reused
* Minimum validity period is 30 days

---

### Audit Trail

Every recreated deal stores the original deal reference.

Example:

```json
{
  "linkedDealId": "6a1aa481e2cdd435681760d0"
}
```

This enables complete deal history tracking.

---

## Success Response

```json
{
  "statusCode": 201,
  "data": {
    "deal": {
      "_id": "6a1aaaa3e8ede2218843b6fc",
      "dealNumber": "DEAL-0005",
      "linkedDealId": "6a1aa481e2cdd435681760d0",
      "status": "pending",
      "role": "buyer",
      "totalAmount": 672.6
    }
  },
  "message": "Deal recreated successfully",
  "success": true
}
```

---

## Response Fields

### Deal Information

| Field        | Description              |
| ------------ | ------------------------ |
| _id          | Newly generated deal ID  |
| dealNumber   | New deal number          |
| linkedDealId | Original expired deal ID |
| role         | buyer / seller / broker  |
| status       | Current deal status      |
| notes        | Deal remarks             |

---

### Approval Status

| Field  | Description            |
| ------ | ---------------------- |
| seller | Seller approval status |
| buyer  | Buyer approval status  |
| broker | Broker approval status |

Possible values:

* pending
* approved
* rejected

---

### Financial Summary

| Field          | Description             |
| -------------- | ----------------------- |
| totalSubtotal  | Product subtotal        |
| totalDiscount  | Total discount          |
| totalGSTAmount | GST amount              |
| grandTotal     | Final calculated amount |
| totalAmount    | Final payable amount    |

---

## Recreate Deal Workflow

| Step | Action                            |
| ---- | --------------------------------- |
| 1    | System checks expired deals       |
| 2    | Original deal is loaded           |
| 3    | Deal status must be expired       |
| 4    | User authorization is verified    |
| 5    | Buyer/Seller role is determined   |
| 6    | Counterparty companies are mapped |
| 7    | Products are copied or overridden |
| 8    | Expiry date is calculated         |
| 9    | linkedDealId is assigned          |
| 10   | New pending deal is created       |

---

## Response Codes

| Status Code | Description                 |
| ----------- | --------------------------- |
| 201         | Deal recreated successfully |
| 400         | Deal is not expired         |
| 401         | Unauthorized                |
| 403         | Permission denied           |
| 404         | Original deal not found     |
| 500         | Internal server error       |

---

## Important Notes

* Only expired deals can be recreated.
* A completely new deal record is generated.
* Original deal remains unchanged.
* Approval workflow starts again.
* Every recreated deal maintains `linkedDealId`.

---

# 2. Get Recreated Deals API

## Endpoint

```http
GET /api/deals/recreated
```

### Example Endpoint

```http
GET /api/deals/recreated?companyId=6a19700c2c6d6d67d875a965
```

---

## Description

This API fetches all recreated deals associated with a company.

A recreated deal is generated from an expired deal using the Recreate Deal feature.

Each recreated deal contains:

* Original deal reference
* Product information
* Financial calculations
* Approval details
* Company participants
* Pagination metadata

---

## Authentication

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Query Parameters

| Parameter | Type             | Required   | Description |
| --------- | ---------------- | ---------- | ----------- |
| companyId | String(ObjectId) | ✅ Required | Company ID  |
| page      | Number           | ❌ Optional | Default: 1  |
| limit     | Number           | ❌ Optional | Default: 10 |

---

## Example Request

```http
GET /api/deals/recreated?companyId=6a19700c2c6d6d67d875a965
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "deals": [],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  },
  "message": "Company recreated deals fetched successfully",
  "success": true
}
```

---

## Response Fields

### Deal Information

| Field        | Description              |
| ------------ | ------------------------ |
| _id          | Recreated deal ID        |
| dealNumber   | New deal number          |
| linkedDealId | Original expired deal ID |
| role         | buyer / seller / broker  |
| status       | Current status           |
| notes        | Deal remarks             |
| dealDate     | Deal creation date       |
| expiryDate   | Deal expiry date         |

---

### Financial Summary

| Field          | Description             |
| -------------- | ----------------------- |
| totalSubtotal  | Product subtotal        |
| totalDiscount  | Discount amount         |
| totalGSTAmount | GST amount              |
| grandTotal     | Final calculated amount |
| totalAmount    | Final payable amount    |

---

### Product Details

| Field        | Description         |
| ------------ | ------------------- |
| productId    | Product information |
| quantity     | Product quantity    |
| price        | Unit price          |
| gst          | GST percentage      |
| gstAmount    | GST amount          |
| discount     | Discount amount     |
| totalAmount  | Product total       |
| paymentTerms | Payment terms       |

---

### Pagination

| Field | Description           |
| ----- | --------------------- |
| total | Total recreated deals |
| page  | Current page          |
| limit | Records per page      |
| pages | Total pages           |

---

## Response Codes

| Status Code | Description                          |
| ----------- | ------------------------------------ |
| 200         | Recreated deals fetched successfully |
| 400         | Invalid companyId                    |
| 401         | Unauthorized                         |
| 403         | Company access denied                |
| 404         | Company not found                    |
| 500         | Internal server error                |

---

## Sample Response Summary

Based on current sample response:

| Field                   | Value                    |
| ----------------------- | ------------------------ |
| Total Recreated Deals   | 2                        |
| Company ID              | 6a19700c2c6d6d67d875a965 |
| Latest Deal Number      | DEAL-0005                |
| Original Deal Reference | 6a1aa481e2cdd435681760d0 |
| Current Status          | pending                  |
| Pagination              | 1 Page, 2 Records        |

---

## Authentication

All Recreated Deal APIs require authentication.

```http
Authorization: Bearer <JWT_TOKEN>
```



# 🚚 Delivery Management APIs

---

# Create Delivery API

## Endpoint

```http
POST /api/delivery
```

### Example Endpoint

```http
POST http://localhost:8080/api/delivery
```

---

## Description

This API is used to create a new delivery record for a deal product.

The API supports two delivery types:

* `sent` → Seller records that goods have been dispatched.
* `received` → Buyer records that goods have been received.

The created delivery remains in **Pending** status until the opposite party approves or rejects it.

The system automatically:

* Validates Deal
* Validates Product belongs to Deal
* Validates remaining quantity
* Validates company authorization
* Creates system chat messages
* Sends notifications to counterparty

---

## Authentication

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Request Fields

| Field         | Type     | Required   | Description        |
| ------------- | -------- | ---------- | ------------------ |
| dealId        | ObjectId | ✅ Required | Deal identifier    |
| productId     | ObjectId | ✅ Required | Product identifier |
| quantity      | Number   | ✅ Required | Delivery quantity  |
| deliveryType  | String   | ✅ Required | sent / received    |
| notes         | String   | ❌ Optional | Additional remarks |
| attachmentUrl | String   | ❌ Optional | Delivery proof     |

---

## Supported Delivery Types

| Value    | Description             |
| -------- | ----------------------- |
| sent     | Seller dispatched goods |
| received | Buyer received goods    |

---

## Example Request (Sent)

```json
{
  "dealId": "6a21534fc22a11d097619c4f",
  "productId": "6a21525ac22a11d097619c0d",
  "quantity": 10,
  "deliveryType": "sent",
  "notes": "Truck dispatched from warehouse.",
  "attachmentUrl": "https://cdn.example.com/slip.jpg"
}
```

---

## Example Request (Received)

```json
{
  "dealId": "6a21534fc22a11d097619c4f",
  "productId": "6a21525ac22a11d097619c0d",
  "quantity": 10,
  "deliveryType": "received",
  "notes": "Goods received successfully.",
  "attachmentUrl": "https://cdn.example.com/slip.jpg"
}
```

---

## Success Response

```json
{
  "statusCode": 201,
  "data": {
    "delivery": {
      "_id": "6a23ecdceb4616f8d280c83e",
      "dealId": "6a21534fc22a11d097619c4f",
      "productId": "6a21525ac22a11d097619c0d",
      "quantity": 10,
      "deliveryType": "sent",
      "notes": "Truck dispatched from warehouse.",
      "attachmentUrl": "https://cdn.example.com/slip.jpg",
      "status": "pending",
      "createdBy": "6a214c662218629e787c8cca",
      "linkedDeliveryId": null,
      "createdAt": "2026-06-06T09:48:12.056Z"
    }
  },
  "message": "Delivery sent entry recorded successfully",
  "success": true
}
```

---

## Business Rules

### Seller

Can create only:

```text
deliveryType = sent
```

### Buyer

Can create only:

```text
deliveryType = received
```

### Validation Rules

* Deal must exist
* Deal status must be Approved or Completed
* Product must belong to Deal
* Quantity must not exceed remaining quantity
* User must represent Deal company

---

## Response Codes

| Status Code | Meaning                       |
| ----------- | ----------------------------- |
| 201         | Delivery created successfully |
| 400         | Validation error              |
| 401         | Unauthorized                  |
| 403         | Permission denied             |
| 404         | Deal/Product not found        |
| 500         | Internal server error         |

---

# Get Deliveries API

## Endpoint

```http
GET /api/delivery
```

### Example Endpoint

```http
GET /api/delivery?page=1&limit=10
```

---

## Description

Returns all deliveries associated with authenticated user's companies.

Supports:

* Pagination
* Search
* Status Filter
* Type Filter
* Company Filter
* Deal Filter

---

## Query Parameters

| Parameter | Required | Description                   |
| --------- | -------- | ----------------------------- |
| page      | ❌        | Current page                  |
| limit     | ❌        | Records per page              |
| dealId    | ❌        | Filter by deal                |
| companyId | ❌        | Filter by company             |
| type      | ❌        | sent / received               |
| status    | ❌        | pending / approved / rejected |
| search    | ❌        | Search deliveries             |

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "data": [],
    "pagination": {
      "total": 12,
      "page": 1,
      "limit": 10,
      "pages": 2
    }
  },
  "message": "Deliveries fetched successfully",
  "success": true
}
```

---

# Get Pending Deliveries API

## Endpoint

```http
GET /api/delivery?status=pending
```

### Example Endpoint

```http
GET /api/delivery?page=1&limit=10&status=pending
```

---

## Description

Returns all delivery entries currently waiting for approval.

---

## Success Response

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Pending deliveries fetched successfully"
}
```

---

# Get Sent Deliveries API

## Endpoint

```http
GET /api/delivery?type=sent
```

### Example Endpoint

```http
GET /api/delivery?page=1&limit=10&type=sent
```

---

## Description

Returns all seller dispatch entries.

---

## Success Response

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Sent deliveries fetched successfully"
}
```

---

# Get Received Deliveries API

## Endpoint

```http
GET /api/delivery?type=received
```

### Example Endpoint

```http
GET /api/delivery?page=1&limit=10&type=received
```

---

## Description

Returns all buyer received delivery entries.

---

## Success Response

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Received deliveries fetched successfully"
}
```

---

# Search Deliveries API

## Endpoint

```http
GET /api/delivery?search=keyword
```

### Example

```http
GET /api/delivery?search=Truck
```

---

## Description

Search delivery records using:

* Product Name
* Deal Number
* Notes
* Delivery Metadata

---

## Success Response

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Search results fetched successfully"
}
```

---

# Update Delivery Status API

## Endpoint

```http
PATCH /api/delivery/:deliveryId/status
```

### Example Endpoint

```http
PATCH /api/delivery/6a23ecdceb4616f8d280c83e/status
```

---

## Description

Approve or reject a pending delivery.

### Authorization Rules

| Delivery Type | Who Can Approve |
| ------------- | --------------- |
| sent          | Buyer           |
| received      | Seller          |

---

## Request Body

### Approve

```json
{
  "status": "approved"
}
```

### Reject

```json
{
  "status": "rejected"
}
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "delivery": {
      "_id": "6a23ecdceb4616f8d280c83e",
      "status": "approved"
    }
  },
  "message": "Delivery status updated successfully",
  "success": true
}
```

---

## Business Logic

When Approved:

* Counterpart delivery created automatically
* Deal progress updated
* Remaining quantity updated
* System message generated
* Notification sent

---

## Response Codes

| Status Code | Meaning                     |
| ----------- | --------------------------- |
| 200         | Status updated successfully |
| 400         | Delivery already processed  |
| 401         | Unauthorized                |
| 403         | Permission denied           |
| 404         | Delivery not found          |
| 500         | Internal server error       |

---

# Delivery Workflow

```text
Seller Creates Sent Entry
          ↓
Status = Pending
          ↓
Buyer Approves
          ↓
Counterpart Received Entry Created
          ↓
Deal Progress Updated
          ↓
Deal Completion Checked
```

---

# Delivery Status Values

| Status   | Description              |
| -------- | ------------------------ |
| pending  | Waiting for approval     |
| approved | Approved by counterparty |
| rejected | Rejected by counterparty |

---

# Authentication

All Delivery APIs require authentication.

```http
Authorization: Bearer <JWT_TOKEN>
```


# 💬 Chat Management APIs

---

# 1. Create Conversation API

## Endpoint

```http
POST /api/chat/conversations
```

### Example Endpoint

```http
POST http://localhost:8080/api/chat/conversations
```

---

## Description

This API is used to create a chat conversation for a specific deal.

If a conversation already exists for the provided deal, the existing conversation is returned instead of creating a new one.

The API automatically:

* Associates the conversation with the Deal
* Stores all participants
* Generates conversation metadata
* Creates a group chat for deal communication

---

## Authentication

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Request Fields

| Field                 | Type     | Required | Description               |
| --------------------- | -------- | -------- | ------------------------- |
| dealId                | ObjectId | ✅ Yes    | Unique Deal ID            |
| participants          | Array    | ✅ Yes    | Conversation participants |
| participants[].userId | ObjectId | ✅ Yes    | Participant User ID       |

---

## Example Request

```json
{
  "dealId": "6a21534fc22a11d097619c4f",
  "participants": [
    {
      "userId": "6a2150ef2218629e787c8dbf"
    },
    {
      "userId": "6a214c662218629e787c8cca"
    }
  ]
}
```

---

## Success Response

```json
{
  "statusCode": 201,
  "data": {
    "_id": "6a215423c22a11d097619cbc",
    "dealId": "6a21534fc22a11d097619c4f",
    "dealNumber": "DEAL-0001",
    "subject": "Chat for Deal #DEAL-0001",
    "type": "group",
    "status": "active",
    "messageCount": 35
  },
  "message": "Conversation created successfully",
  "success": true
}
```

---

## Business Logic

* Checks if conversation already exists.
* Validates Deal ID.
* Ensures Deal status is approved.
* Validates participants.
* Creates group conversation.
* Initializes metadata.

---

## Response Codes

| Status Code | Meaning                           |
| ----------- | --------------------------------- |
| 201         | Conversation created successfully |
| 400         | Validation error                  |
| 401         | Unauthorized                      |
| 404         | Deal not found                    |
| 500         | Internal server error             |

---

# 2. Get All Conversations API

## Endpoint

```http
GET /api/chat/conversations
```

### Example Endpoint

```http
GET /api/chat/conversations?page=1&limit=10
```

---

## Description

Returns all conversations associated with the authenticated user.

Features:

* Deal information
* Participants
* Last message
* Unread message count
* Pagination support

---

## Query Parameters

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| page      | Number | ❌ No     | Default: 1  |
| limit     | Number | ❌ No     | Default: 10 |

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "data": [],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  },
  "message": "Conversations fetched successfully",
  "success": true
}
```

---

## Conversation Fields

| Field        | Description             |
| ------------ | ----------------------- |
| _id          | Conversation ID         |
| dealNumber   | Deal reference          |
| subject      | Conversation title      |
| type         | group / direct          |
| status       | active / inactive       |
| messageCount | Total messages          |
| unreadCount  | Unread messages         |
| participants | Conversation members    |
| lastMessage  | Latest message          |
| createdAt    | Creation timestamp      |
| updatedAt    | Last activity timestamp |

---

# 3. Send Message API

## Endpoint

```http
POST /api/chat/conversations/:conversationId/messages
```

### Example Endpoint

```http
POST /api/chat/conversations/6a215423c22a11d097619cbc/messages
```

---

## Description

This API sends a new message inside an existing conversation.

The system automatically:

* Validates conversation
* Verifies user participation
* Resolves sender role
* Resolves company information
* Updates last message metadata

---

## Path Parameters

| Parameter      | Type     | Required | Description     |
| -------------- | -------- | -------- | --------------- |
| conversationId | ObjectId | ✅ Yes    | Conversation ID |

---

## Request Fields

| Field   | Type   | Required | Description     |
| ------- | ------ | -------- | --------------- |
| content | String | ✅ Yes    | Message content |
| type    | String | ❌ No     | Message type    |

---

## Supported Message Types

| Type     |
| -------- |
| text     |
| image    |
| document |
| voice    |
| system   |

---

## Example Request

```json
{
  "content": "Hello Seller, Is the shipment ready?",
  "type": "text"
}
```

---

## Success Response

```json
{
  "statusCode": 201,
  "data": {
    "_id": "6a23c8c8cef13fe137d8e81e",
    "conversationId": "6a215423c22a11d097619cbc",
    "content": "Hello Seller, Is the shipment ready?",
    "type": "text",
    "status": "sent"
  },
  "message": "Message sent successfully",
  "success": true
}
```

---

## Response Codes

| Status Code | Meaning                       |
| ----------- | ----------------------------- |
| 201         | Message sent successfully     |
| 400         | Message content required      |
| 401         | Unauthorized                  |
| 403         | User not part of conversation |
| 404         | Conversation not found        |
| 500         | Internal server error         |

---

# 4. Get Messages API

## Endpoint

```http
GET /api/chat/conversations/:conversationId/messages
```

### Example Endpoint

```http
GET /api/chat/conversations/6a215423c22a11d097619cbc/messages?page=1&limit=50
```

---

## Description

Fetches all messages of a conversation.

Features:

* Pagination
* Sender details
* Mentions support
* Deleted message handling
* Read receipt support

---

## Query Parameters

| Parameter | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| page      | Number | ❌ No     | Default 1   |
| limit     | Number | ❌ No     | Default 50  |

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "data": [],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 50,
      "pages": 1
    }
  },
  "message": "Messages fetched successfully",
  "success": true
}
```

---

## Message Types

| Type     | Description                 |
| -------- | --------------------------- |
| text     | Standard text message       |
| image    | Image attachment            |
| document | Document attachment         |
| voice    | Voice message               |
| system   | Auto-generated system event |

---

## Special Cases

### System Message Example

```json
{
  "sender": {
    "name": "Pravisti System",
    "role": "system"
  },
  "type": "system"
}
```

Examples:

* Payment Created
* Payment Approved
* Delivery Created
* Delivery Approved

---

### Deleted Message

```json
{
  "content": "This message was deleted."
}
```

---

# 5. Mark Conversation As Read API

## Endpoint

```http
PUT /api/chat/conversations/:conversationId/read
```

### Example Endpoint

```http
PUT /api/chat/conversations/6a215423c22a11d097619cbc/read
```

---

## Description

Marks a conversation as read for the currently authenticated user.

The system updates:

```text
participant.lastReadAt
```

This value is later used for unread message calculation.

---

## Path Parameters

| Parameter      | Type     | Required | Description     |
| -------------- | -------- | -------- | --------------- |
| conversationId | ObjectId | ✅ Yes    | Conversation ID |

---

## Request Body

No request body required.

---

## Success Response

```json
{
  "statusCode": 200,
  "message": "Marked as read successfully",
  "success": true
}
```

---

## Business Logic

* Finds conversation.
* Verifies participant.
* Updates lastReadAt timestamp.
* Saves conversation.
* Recalculates unread count.

---

## Response Codes

| Status Code | Meaning                     |
| ----------- | --------------------------- |
| 200         | Marked as read successfully |
| 401         | Unauthorized                |
| 404         | Conversation not found      |
| 500         | Internal server error       |

---

# Authentication

All Chat APIs require authentication.

```http
Authorization: Bearer <JWT_TOKEN>
```
# 💰 Payment Management APIs

## Base URL

```http
http://localhost:8080/api/payment
```

---

# Authentication

All Payment APIs require JWT Authentication.

## Headers

| Key           | Value                |
| ------------- | -------------------- |
| Authorization | Bearer `<JWT_TOKEN>` |
| Content-Type  | application/json     |

---

# 1. Create Payment API (Buyer → Payment Sent)

## Endpoint

```http
POST /api/payment
```

### Example Endpoint

```http
POST http://localhost:8080/api/payment
```

---

## Description

This API is used by the Buyer to record a payment sent against a Deal.

The system automatically:

* Validates Deal ownership
* Validates Buyer company
* Validates payment amount
* Creates payment entry
* Marks payment as pending
* Sends notification to Seller
* Creates system chat message

---

## Request Body

| Field         | Type     | Required   | Description                      |
| ------------- | -------- | ---------- | -------------------------------- |
| dealId        | ObjectId | ✅ Required | Deal ID                          |
| amount        | Number   | ✅ Required | Payment amount                   |
| paymentType   | String   | ✅ Required | sent                             |
| paymentMethod | String   | ✅ Required | UPI, Bank Transfer, Cash, Cheque |
| notes         | String   | ❌ Optional | Additional notes                 |
| attachmentUrl | String   | ❌ Optional | Payment proof                    |

---

## Example Request

```json
{
  "dealId": "6a21534fc22a11d097619c4f",
  "amount": 0.76,
  "paymentType": "sent",
  "paymentMethod": "UPI",
  "notes": "Advance payment transferred.",
  "attachmentUrl": "https://cdn.example.com/payment-proof.jpg"
}
```

---

## Success Response

```json
{
  "statusCode": 201,
  "data": {
    "payment": {
      "_id": "6a23f7e0dc350d53efca3c1a",
      "dealId": "6a21534fc22a11d097619c4f",
      "amount": 0.76,
      "paymentType": "sent",
      "paymentMethod": "UPI",
      "status": "pending"
    }
  },
  "message": "Sent payment entry added successfully",
  "success": true
}
```

---

# 2. Create Payment API (Seller → Payment Received)

## Endpoint

```http
POST /api/payment
```

---

## Description

This API is used by the Seller to record a payment received against a Deal.

---

## Example Request

```json
{
  "dealId": "6a21534fc22a11d097619c4f",
  "amount": 25000,
  "paymentType": "received",
  "paymentMethod": "Bank Transfer",
  "notes": "Payment received successfully.",
  "attachmentUrl": "https://cdn.example.com/bank-slip.pdf"
}
```

---

## Success Response

```json
{
  "statusCode": 201,
  "message": "Received payment entry added successfully",
  "success": true
}
```

---

# 3. Get All Payments API

## Endpoint

```http
GET /api/payment?page=1&limit=10
```

---

## Description

Returns all payments associated with the authenticated user's companies.

### Features

* Pagination
* Deal Information
* Company Information
* Payment Status Tracking
* Payment Type Filtering
* Search Support
* Sorting Support

---

## Query Parameters

| Parameter | Required | Description                                   |
| --------- | -------- | --------------------------------------------- |
| page      | ❌        | Current page                                  |
| limit     | ❌        | Records per page                              |
| dealId    | ❌        | Filter by deal                                |
| companyId | ❌        | Filter by company                             |
| type      | ❌        | sent / received                               |
| role      | ❌        | buyer / seller                                |
| status    | ❌        | pending / partially_paid / fully_paid         |
| search    | ❌        | Search payment                                |
| sortBy    | ❌        | highest_amount, lowest_amount, latest, oldest |

---

## Example Request

```http
GET /api/payment?page=1&limit=10
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "payments": [],
    "pagination": {
      "total": 17,
      "page": 1,
      "limit": 10,
      "pages": 4
    }
  },
  "message": "All payments fetched successfully",
  "success": true
}
```

---

# 4. Get Payments By Deal API

## Endpoint

```http
GET /api/payment?dealId={dealId}
```

### Example

```http
GET /api/payment?dealId=6a21534fc22a11d097619c4f
```

---

## Description

Fetch all payment records linked to a specific deal.

---

# 5. Get Sent Payments API

## Endpoint

```http
GET /api/payment?type=sent
```

### Description

Returns all payment entries where paymentType is `sent`.

---

# 6. Get Received Payments API

## Endpoint

```http
GET /api/payment?type=received
```

### Description

Returns all payment entries where paymentType is `received`.

---

# 7. Get Buyer Payments API

## Endpoint

```http
GET /api/payment?role=buyer
```

### Description

Returns all payments where the authenticated user participates as Buyer.

---

# 8. Get Seller Payments API

## Endpoint

```http
GET /api/payment?role=seller
```

### Description

Returns all payments where the authenticated user participates as Seller.

---

# 9. Get Fully Paid Deals API

## Endpoint

```http
GET /api/payment?status=fully_paid
```

### Description

Returns payments linked to fully paid deals.

---

# 10. Get Partially Paid Deals API

## Endpoint

```http
GET /api/payment?status=partially_paid
```

---

# 11. Get Pending Payments API

## Endpoint

```http
GET /api/payment?status=pending
```

---

# 12. Search Payments API

## Endpoint

```http
GET /api/payment?search=advance
```

### Description

Search payments using:

* Deal Number
* Notes
* Payment Method
* Company Information

---

# 13. Sort Payments APIs

### Highest Amount

```http
GET /api/payment?sortBy=highest_amount
```

### Lowest Amount

```http
GET /api/payment?sortBy=lowest_amount
```

### Latest

```http
GET /api/payment?sortBy=latest
```

### Oldest

```http
GET /api/payment?sortBy=oldest
```

---

# 14. Company Wise Payments API

## Endpoint

```http
GET /api/payment?companyId={companyId}
```

---

# 15. Combined Filters Example

```http
GET /api/payment?page=1&limit=10&type=sent&status=partially_paid&sortBy=highest_amount
```

---

# 16. Payment Dashboard Summary API

## Endpoint

```http
GET /api/payment/dashboard
```

### Optional Filters

```http
GET /api/payment/dashboard?companyId={companyId}
```

```http
GET /api/payment/dashboard?dealId={dealId}
```

---

## Success Response

```json
{
  "statusCode": 200,
  "data": {
    "totalAmountSent": 22397.76,
    "totalAmountReceived": 202500,
    "totalPendingToPay": 0,
    "totalPendingToReceive": 0
  },
  "message": "Payment dashboard summary fetched successfully",
  "success": true
}
```

---

# 17. Update Payment Status API

## Endpoint

```http
PATCH /api/payment/:paymentId/status
```

---

## Approve Payment

### Request

```json
{
  "status": "approved"
}
```

### Response

```json
{
  "statusCode": 200,
  "message": "Payment entry status updated to approved successfully",
  "success": true
}
```

---

## Reject Payment

### Request

```json
{
  "status": "rejected"
}
```

### Response

```json
{
  "statusCode": 200,
  "message": "Payment entry status updated to rejected successfully",
  "success": true
}
```

---

# Payment Status Values

| Status         | Description              |
| -------------- | ------------------------ |
| pending        | Waiting for approval     |
| approved       | Approved by counterparty |
| rejected       | Rejected by counterparty |
| partially_paid | Partially paid deal      |
| fully_paid     | Fully paid deal          |

---

# Payment Workflow

```text
Buyer Creates Payment Sent Entry
            ↓
Status = Pending
            ↓
Seller Approves
            ↓
Received Entry Created
            ↓
Deal Payment Progress Updated
            ↓
Fully Paid Check
```

---

# Common Error Responses

## Deal Not Found

```json
{
  "statusCode": 404,
  "message": "Deal not found"
}
```

## Unauthorized Company

```json
{
  "statusCode": 403,
  "message": "You do not represent any company involved in this deal and cannot record payments"
}
```

## Payment Amount Exceeded

```json
{
  "statusCode": 400,
  "message": "Payment amount exceeds remaining balance"
}
```

## Already Approved

```json
{
  "statusCode": 400,
  "message": "Payment is already approved and cannot be updated"
}
```

---

# Response Codes

| Status Code | Meaning                      |
| ----------- | ---------------------------- |
| 200         | Success                      |
| 201         | Payment created successfully |
| 400         | Validation error             |
| 401         | Unauthorized                 |
| 403         | Permission denied            |
| 404         | Resource not found           |
| 500         | Internal server error        |
