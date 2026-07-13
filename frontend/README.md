# school-frontend

React + Material UI frontend for the school-management microservices backend
(`../backend`). Fully responsive (mobile / tablet / desktop) with light & dark
mode and English / Khmer i18n.

## Stack

- **React 18 + Vite 5** — dev server and build
- **Material UI v6** — components and theming (responsive drawer, dialogs, tables)
- **Tailwind CSS v3** — utility classes (preflight disabled so it coexists with MUI)
- **Redux Toolkit** — UI state (sidebar, snackbar) and notifications
- **React Context** — auth session (`AuthContext`) and color mode (`ThemeContext`)
- **React Router v6** — routing with role-based `ProtectedRoute`
- **Axios** — API client with JWT access/refresh interceptors
- **i18next** — English + Khmer translations

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api/*` to the backend nginx gateway at
`http://localhost:80` (see `vite.config.js`). Start the backend first:

```bash
cd ../backend
docker compose up -d
```

Then register an account at `/register` (pick a role) and sign in.

### Scripts

| Script            | Purpose                          |
| ----------------- | -------------------------------- |
| `npm run dev`     | Vite dev server with API proxy   |
| `npm run build`   | Production build to `dist/`      |
| `npm run preview` | Serve the production build       |
| `npm run lint`    | ESLint (flat config)             |

### Environment

Copy `.env.example` to `.env` if you need to override:

- `VITE_API_URL` — API origin for production builds (empty = same origin / dev proxy)
- `VITE_PROXY_TARGET` — where the dev proxy forwards `/api` (default `http://localhost:80`)

## Backend mapping

| Page          | Route         | Gateway endpoint                | Write roles            |
| ------------- | ------------- | ------------------------------- | ---------------------- |
| Dashboard     | `/`           | list metas, notifications       | —                      |
| Students      | `/students`   | `/api/students/`                | admin, staff           |
| Teachers      | `/teachers`   | `/api/teachers/`                | admin, staff           |
| Classes       | `/classes`    | `/api/classes/`                 | admin, staff           |
| Courses       | `/courses`    | `/api/courses/`                 | admin, staff           |
| Grades        | `/grades`     | `/api/grades/`                  | admin, teacher         |
| Attendance    | `/attendance` | `/api/attendance/` + `/mark`    | admin, staff, teacher  |
| Payments      | `/payments`   | sample data (service not wired) | admin, staff           |
| Profile       | `/profile`    | `/api/auth/me`                  | —                      |

Deletes are admin-only, matching the backend `authorize()` rules. All requests
use the backend envelope `{ success, data, meta }`; auth uses JWT access tokens
with a single-flight refresh in `src/services/api.js`.

## Structure

```
src/
  assets/           images / icons / fonts
  components/
    common/         Button, Input, Modal, DataTable, CrudManager
    home/           Home (dashboard), Calendar, maps, temperature
    layout/         Header, Sidebar, Footer
    protected/      ProtectedRoute (auth + role guard)
  pages/            login, register, profile, student, teacher, grade,
                    course, attendance, classroom, payment
  features/         notifications, messages, authentication, dashboard
  hooks/            useAuth, useFetch, useForm
  context/          AuthContext, ThemeContext
  redux/            store, actions, reducers
  services/         api (axios + refresh flow), endpoints
  utils/            helpers, validators, constants
```
