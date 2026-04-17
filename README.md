Here is your full README:

    markdown
# HNG Stage 1 - Profile Intelligence API

A REST API that accepts a name, enriches it using three external APIs (Genderize, Agify, Nationalize), stores the result in a PostgreSQL database, and allows retrieval and management of stored profiles.

## Links

- GitHub Repository: https://github.com/osazuwadev/hng-stage-1-api
- Live API URL: https://your-live-url.com (update after deployment)

## Tech Stack

- Node.js
- Express.js
- PostgreSQL (Neon)
- Prisma ORM
- Axios
- UUID v7

## External APIs Used

- Genderize: https://api.genderize.io
- Agify: https://api.agify.io
- Nationalize: https://api.nationalize.io

## Setup & Installation

    bash
# clone the repo
git clone https://github.com/osazuwadev/hng-stage-1-api.git

# move into the folder
cd hng-stage-1-api

# install dependencies
npm install

# setup environment variables
cp .env.example .env
# then update .env with your DATABASE_URL

# push schema to database
npx prisma db push

# generate prisma client
npx prisma generate

# run in development
npm run dev

# run in production
npm start


## Environment Variables

Create a `.env` file in the root folder:

DATABASE_URL="your-neon-postgresql-connection-string"


## Base URL

https://your-live-url.com


## Endpoints

### 1. POST /api/profiles

Creates a new profile by enriching a name with gender, age, and nationality data.

**Request Body:**
    json
{
    "name": "nelson"
}

**Success Response (201):**
    json
{
  "status": "success",
  "data": {
    "id": "019d9d5d-777a-750f-8387-c3772a2c1fd8",
    "name": "nelson",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 281761,
    "age": 61,
    "age_group": "senior",
    "country_id": "US",
    "country_probability": 0.23,
    "created_at": "2026-04-17T21:34:01.598Z"
  }
}


**Idempotency - Profile already exists (200):**
    json
{
  "status": "success",
  "message": "Profile already exists",
  "data": {
    "id": "019d9d5d-777a-750f-8387-c3772a2c1fd8",
    "name": "nelson",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 281761,
    "age": 61,
    "age_group": "senior",
    "country_id": "US",
    "country_probability": 0.23,
    "created_at": "2026-04-17T21:34:01.598Z"
  }
}


---

### 2. GET /api/profiles

Returns all profiles. Supports optional filters.

**Query Parameters (all optional):**

| Parameter | Type | Description |
|---|---|---|
| gender | string | Filter by gender (male/female) |
| country_id | string | Filter by country code (e.g. NG, US) |
| age_group | string | Filter by age group (child/teenager/adult/senior) |

**Example Request:**
```
GET /api/profiles?gender=male&country_id=US

**Success Response (200):**
    json
{
  "status": "success",
  "count": 1,
  "data": [
    {
      "id": "019d9d5d-777a-750f-8387-c3772a2c1fd8",
      "name": "nelson",
      "gender": "male",
      "gender_probability": 0.99,
      "sample_size": 281761,
      "age": 61,
      "age_group": "senior",
      "country_id": "US",
      "country_probability": 0.23,
      "created_at": "2026-04-17T21:34:01.598Z"
    }
  ]
}


---

### 3. GET /api/profiles/:id

Returns a single profile by ID.

**Example Request:**

GET /api/profiles/019d9d5d-777a-750f-8387-c3772a2c1fd8


**Success Response (200):**
    json
{
  "status": "success",
  "data": {
    "id": "019d9d5d-777a-750f-8387-c3772a2c1fd8",
    "name": "nelson",
    "gender": "male",
    "gender_probability": 0.99,
    "sample_size": 281761,
    "age": 61,
    "age_group": "senior",
    "country_id": "US",
    "country_probability": 0.23,
    "created_at": "2026-04-17T21:34:01.598Z"
  }
}


---

### 4. DELETE /api/profiles/:id

Deletes a profile by ID.

**Example Request:**

DELETE /api/profiles/019d9d5d-777a-750f-8387-c3772a2c1fd8


**Success Response:** `204 No Content`



## Error Responses

### 400 - Missing or empty name
    json
{
  "status": "error",
  "message": "name is required"
}


### 422 - Invalid name type
    json
{
  "status": "error",
  "message": "name must be a string"
}

### 404 - Profile not found
    json
{
  "status": "error",
  "message": "Profile not found"
}


### 502 - External API returned invalid response
    json
{
  "status": "502",
  "message": "Genderize returned an invalid response"
}


### 500 - Server error
json
{
  "status": "error",
  "message": "Something went wrong, please try again"
}

## Edge Cases

- If Genderize returns gender null or count 0 → 502 error, profile not stored
- If Agify returns age null → 502 error, profile not stored
- If Nationalize returns no country data → 502 error, profile not stored
- Same name submitted twice → returns existing profile, no duplicate created

## Age Groups

| Age Range | Group |
|---|---|
| 0 - 12 | child |
| 13 - 19 | teenager |
| 20 - 59 | adult |
| 60+ | senior |
