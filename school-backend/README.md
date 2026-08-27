# project-school

School management system: four Node.js microservices behind an **nginx API gateway**, sharing a common library (`shared/`), backed by MySQL (one database per service), Redis (refresh tokens + access-token blacklist), and JWT auth — all orchestrated with docker-compose.

## Architecture

```
                        ┌──────────────────────┐
  client ── :8080 ────► │    nginx gateway     │
                        └──────────┬───────────┘
        ┌──────────────┬───────────┴──┬──────────────┐─────────────────────┐
        ▼              ▼              ▼              ▼                     ▼
  auth-service   academic-service  records-service  payment-service   notification-service
     :4001            :4002            :4003            :4004             4005
        │              │                │                │                  │
     auth_db       academic_db      records_db      payment_db           (BullMQ)──────────────┐
      |  └──────────────┴───── redis ────┴────────────────┘                                    |
      ┴─────────────────┴────────────────┴──────────────┴───────────Redis (cache + queues) ────┘
```

Services are **not** exposed to the host — only the gateway on port 8080.

| Gateway route | Service | Notes |
|---|---|---|
| `/api/auth/*` | auth-service | login, register, refresh, logout |
| `/api/students`, `/api/teachers`, `/api/classrooms`, `/api/courses`, `/api/enrollments` | academic-service | `/api/enrollments` binds a student to a course per academic year + term |
| `/api/grades`, `/api/attendance` | records-service | |
| `/api/payments` | payment-service | admin only |

## Shared library (`shared/`)

Installed into every service as a local npm package (`"school-shared": "file:../../shared"`):

| Module | Provides |
|---|---|
| `config` | central env-driven configuration |
| `logger` | structured JSON logs + per-request logging middleware |
| `db` | lazy MySQL pool singleton (`getPool()`) |
| `redis` | lazy Redis client singleton (`getRedis()`) |
| `middleware` | `authenticate` (JWT + Redis blacklist), `requireRole`, `notFound`, `errorHandler` |
| `server` | `createService({ routes, auth })` — builds and starts a standard express app |
| `utils` | `asyncHandler`, `buildWhere`, `toLetterGrade` |

A service entrypoint is now just:

```js
const { createService } = require('school-shared');

createService({
  routes: [{ path: '/payments', router: require('./routes/payments') }],
});
```

## Quick start

```bash
cp .env.example .env       # then edit .env — set real secrets
docker compose up --build
```

First boot runs `db/init.sql`, creating all four databases and a seed admin:
`admin@school.local` / `admin123` (change it immediately).

For local development outside Docker, install shared deps first:

```bash
cd shared && npm install
cd ../services/academic-service && npm install && npm run dev
```

## Auth flow (through the gateway)

```bash
# Login
curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@school.local","password":"admin123"}'
# -> { accessToken, refreshToken, user }

# Register (open by default — lock down for production)
curl -s -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"teacher1@school.local","password":"secret-pass-1","role":"teacher"}'

# Refresh (rotates the refresh token)
curl -s -X POST http://localhost:8080/api/auth/refresh \
  -H 'Content-Type: application/json' -d '{"refreshToken":"<token>"}'

# Logout (revokes refresh token + blacklists access token in Redis)
curl -s -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer <accessToken>" \
  -H 'Content-Type: application/json' -d '{"refreshToken":"<refreshToken>"}'
```

## Using the API

All routes require `Authorization: Bearer <accessToken>`.

```bash
TOKEN=<accessToken>
B=http://localhost:8080/api

curl -s -X POST $B/teachers -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Ms. Dara","phone":"012345678"}'
curl -s -X POST $B/classrooms -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Grade 10A","teacher_id":1}'
curl -s -X POST $B/students -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Sokha","classroom_id":1,"gender":"female"}'
curl -s $B/students -H "Authorization: Bearer $TOKEN"

curl -s -X POST $B/grades -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"student_id":1,"course_id":1,"score":88.5}'
curl -s -X POST $B/attendance/bulk -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"classroom_id":1,"date":"2026-07-08","records":[{"student_id":1,"status":"present"}]}'

curl -s -X POST $B/payments -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"student_id":1,"amount":150.00}'
curl -s -X PATCH $B/payments/1/status -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"paid"}'
```

## Role permissions

| Action | admin | teacher | student |
|---|---|---|---|
| Read academic data | yes | yes | yes |
| Manage students/teachers/classrooms | yes | no | no |
| Manage courses | yes | yes | no |
| Record grades/attendance | yes | yes | no |
| Read/manage payments | yes | no | no |

## Redis keys

- `refresh:<userId>:<jti>` — whitelisted refresh tokens (7-day TTL, rotated on use)
- `blacklist:<accessToken>` — revoked access tokens (TTL = remaining lifetime)
- `enrollment:<id>` / `enrollment:list:*` — cache-aside for enrollment reads (invalidated on write)

Auth middleware fails closed: if Redis is unreachable, protected requests are rejected.

## Project layout

```
school-backend/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── db/
│   ├── init.sql 
├── infra/
│   └── redis/
│       └── redis.conf
├── nginx/
│   └── nginx.conf
├── logs/
│   └── file.log
├── shared/
│   ├── config/
│   │   └── index.js
│   ├── db/
│   │   └── index.js
│   ├── logger/
│   │   └── index.js
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── authorize.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   │   └── logErr.js
│   ├── redis/
│   │   └── index.js
│   ├── server/
│   │   └── index.js
│   ├── utils/
│   │   ├── index.js
│   ├── package.json
│   └── index.js
└── services/
    ├── auth-service/
    │   ├── src/
    │   │   ├── config/
    │   │   │   └── db.js
    │   │   ├── clients/
    │   │   │   ├── academic.client.js
    │   │   │   ├── notification.client.js
    │   │   │   └── payment.client.js
    │   │   ├── controllers/
    │   │   │   └── auth.controller.js
    │   │   ├── models/
    │   │   │   ├── index.js
    │   │   │   └── user.model.js 
    │   │   ├── routes/
    │   │   │   └── auth.routes.js 
    │   │   ├── services/
    │   │   │   └── auth.service.js 
    │   │   │   └── email.service.js
    │   │   ├── validators/
    │   │   │   └── auth.validator.js  
    │   │   ├── app.js
    │   │   └── index.js 
    │   ├── .env
    │   ├── Dockerfile
    │   └── package.json 
    ├── academic-service/
    │   ├── src/
    │   │   ├── config/
    │   │   │   └── db.js 
    │   │   ├── clients/
    │   │   │   ├── auth.client.js
    │   │   │   ├── notification.client.js
    │   │   │   └── payment.client.js 
    │   │   ├── controllers/
    │   │   │   ├── class.controller.js
    │   │   │   ├── course.controller.js 
    │   │   │   ├── enrollment.controller.js 
    │   │   │   ├── student.controller.js
    │   │   │   └── teacher.controller.js 
    │   │   ├── models/
    │   │   │   ├── index.js
    │   │   │   ├── classe.model.js
    │   │   │   ├── course.model.js 
    │   │   │   ├── enrollment.model.js 
    │   │   │   ├── student.model.js
    │   │   │   └── teacher.model.js 
    │   │   ├── routes/
    │   │   │   ├── class.routes.js
    │   │   │   ├── course.routes.js 
    │   │   │   ├── enrollment.routes.js 
    │   │   │   ├── student.routes.js
    │   │   │   └── teacher.routes.js 
    │   │   ├── services/
    │   │   │   ├── class.service.js
    │   │   │   ├── course.service.js 
    │   │   │   ├── enrollment.service.js 
    │   │   │   ├── student.service.js
    │   │   │   └── teacher.service.js 
    │   │   ├── validators/
    │   │   │   ├── class.validator.js
    │   │   │   ├── course.validator.js
    │   │   │   ├── enrollment.validator.js
    │   │   │   ├── student.validator.js
    │   │   │   └── teacher.validator.js
    │   │   ├── app.js
    │   │   └── index.js 
    │   ├── .env
    │   ├── Dockerfile
    │   └── package.json 
    ├── records-service/
    │   ├── src/
    │   │   ├── config/
    │   │   │   └── db.js 
    │   │   ├── clients/
    │   │   │   ├── academic.client.js
    │   │   │   ├── auth.client.js
    │   │   │   └── notification.client.js 
    │   │   ├── controllers/
    │   │   │   ├── attendance.controller.js
    │   │   │   └── grade.controller.js 
    │   │   ├── models/
    │   │   │   ├── index.js
    │   │   │   ├── attendance.model.js
    │   │   │   └── grade.model.js 
    │   │   ├── routes/
    │   │   │   ├── attendance.routes.js
    │   │   │   └── grade.routes.js 
    │   │   ├── services/
    │   │   │   ├── attendance.service.js
    │   │   │   └── grade.service.js 
    │   │   ├── validators/
    │   │   │   ├── attendance.validator.js
    │   │   │   └── grade.validator.js 
    │   │   ├── app.js
    │   │   └── index.js 
    │   ├── .env
    │   ├── Dockerfile
    │   └── package.json 
    ├── notification-service/
    │   ├── src/
    │   │   ├── clients/
    │   │   │   ├── directory.client.js
    │   │   ├── routes/
    │   │   │   ├── internal.routes.js
    │   │   │   └── notification.routes.js 
    │   │   ├── app.js
    │   │   └── index.js 
    │   │   └── queue.js 
    │   │   └── dispatcher.js 
    │   ├── .env
    │   ├── Dockerfile
    │   └── package.json 
    ├── administra-service/
    │   ├── src/
    │   │   ├── config/
    │   │   │   └── db.js
    │   │   ├── clients/ 
    │   │   │   ├── notification.client.js 
    │   │   ├── controllers/
    │   │   │   └── department.controller.js
    │   │   │   └── staff.controller.js
    │   │   ├── models/
    │   │   │   ├── index.js
    │   │   │   └── staff.model.js 
    │   │   │   └── department.model.js 
    │   │   ├── routes/
    │   │   │   └── staff.routes.js 
    │   │   │   └── department.routes.js 
    │   │   ├── services/
    │   │   │   └── department.service.js 
    │   │   │   └── staff.service.js 
    │   │   ├── validators/
    │   │   │   └── staff.validator.js 
    │   │   │   └── department.validator.js 
    │   │   ├── app.js
    │   │   └── index.js 
    │   ├── .env
    │   ├── Dockerfile
    │   └── package.json 
    └── payment-service/
        ├── src/
        │   ├── config/
        │   │   └── db.js 
        │   ├── clients/
        │   │   ├── academic.client.js
        │   │   └── auth.client.js 
        │   ├── controllers/
        │   │   └── payment.controller.js 
        │   ├── models/
        │   │   ├── index.js
        │   │   └── payment.model.js 
        │   ├── routes/
        │   │   └── payment.routes.js 
        │   ├── services/
        │   │   └── payment.service.js 
        │   ├── validators/
        │   │   └── payment.validator.js 
        │   ├── app.js
        │   ├── index.js 
        │   ├── .env
        │   ├── Dockerfile
        │   └── package.json

```

## Production notes

- Restrict `/auth/register` — require an admin token or an invite flow.
- Give each service its own MySQL user scoped to its database instead of root.
- Terminate TLS at nginx (add a `listen 443 ssl` block with certificates).
- Version the shared library (publish to a private registry) once teams split, so a change to `shared/` doesn't force redeploying every service at once.


## env
  -academic-service
  ```
    NODE_ENV=development
    DB_HOST=localhost
    DB_PORT=5307
    DB_NAME=academic_db
    DB_USER=academic_user
    DB_PASSWORD=academicpass

    PORT=5002
  ```
  -auth-service
  ```
    NODE_ENV=development 
    DB_HOST=localhost
    DB_PORT=5306
    DB_NAME=auth_db
    DB_USER=auth_user
    DB_PASSWORD=authpass

    PORT=5001
  ```
  -payment-service
  ```
    NODE_ENV=development
    DB_HOST=localhost
    DB_PORT=5309
    DB_NAME=payment_db
    DB_USER=payment_user
    DB_PASSWORD=paymentpass
    BAKONG_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiZmNiNDBmMWZiZTJlNGM5OSJ9LCJpYXQiOjE3ODM3NjA1NjIsImV4cCI6MTc5MTUzNjU2Mn0.nZj2FyrhWLTwu3L1LgHoRXiXs141k7yGkXVnIg4zmpc
  ```
  -record-service
  ```
    NODE_ENV=development 
    DB_HOST=localhost
    DB_PORT=5308
    DB_NAME=record_db
    DB_USER=record_user
    DB_PASSWORD=recordpass

    PORT=5003

    # Cross-service binding to academic-service (ref verification + joins).
    # Local dev: academic-service runs on 5002 (see its .env); in docker this is
    # overridden to http://academic-service:4002 by docker-compose.yml.
    ACADEMIC_SERVICE_URL=http://localhost:5002
  ```
    
    npm install --omit=dev installs only your production dependencies (dependencies) and skips all development dependencies (devDependencies) listed in your package.json

    #onmac pull redis & nginx
docker pull redis:7-alpine
docker pull nginx:1.27-alpine

## check
services:
  auth-service:
    image: your-auth-image
    expose:
      - "4001"

docker compose up -d --scale auth-service=3

                       ┌── auth × 3
                       │
                       ├── academic × 3
Internet → NGINX ─────┼── record × 3
                       │
                       ├── payment × 2
                       │
                       └── notification × 2