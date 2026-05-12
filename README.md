# UniHelp - Campus Management Portal

UniHelp is a full-stack campus management portal built with React, Express.js, MongoDB, Mongoose, JWT authentication, Socket.io, and Cloudinary. The application is designed for a university environment where students can raise support requests, register for events, view policies, and receive real-time updates, while administrators can manage requests, events, policies, circulars, and registrations.

## Project Overview

The portal has two main roles:

- Student: submits requests, tracks request status, registers for campus events, views policies, and downloads circulars.
- Admin: manages student requests, assigns priorities and staff, updates status/history, creates events, controls event registration, uploads posters, publishes policies, uploads circulars, and exports attendance data.

The system uses MongoDB for persistent data storage and Socket.io for real-time updates between admin and student dashboards.

## Tech Stack

| Area | Technology | Usage |
| --- | --- | --- |
| Frontend | React | Student/admin dashboards and routing |
| Routing | React Router DOM | Role-based page navigation |
| Backend | Node.js + Express.js | REST API server |
| Database | MongoDB | Stores users, requests, events, policies, logs |
| ODM | Mongoose | Database schemas and validation |
| Authentication | JWT + bcryptjs | Secure login and protected routes |
| Realtime | Socket.io | Live dashboard/request/event updates |
| File Uploads | Multer | Handles request attachments, event posters, policy circulars |
| Cloud Storage | Cloudinary | Stores uploaded posters and circulars |
| Styling | CSS | Dashboard UI and responsive layouts |

## Core Features

### Authentication and Authorization

- Student and admin login.
- Password hashing with bcrypt.
- JWT-based authentication.
- Protected API routes using middleware.
- Role-based access control for admin-only operations.

### Student Request Management

Students can:

- Submit campus support requests.
- Add request title, category, and description.
- Upload attachments.
- View their own request history.
- Track status updates, priority, assigned admin, and history messages.

Admins can:

- View all student requests.
- Assign requests to admins.
- Set request priority.
- Change status.
- Add notes/history.
- Run SLA escalation checks.

### Event Management

Admins can:

- Create, edit, and delete events.
- Upload event posters.
- Set event category, location, start time, end time, registration deadline, capacity, target audience, and status.
- Extend registration deadline and increase available seats.
- Export attendance as CSV.
- View registration attempt logs.

Students can:

- Browse campus events.
- View event posters in a full-screen overlay.
- Register using a detailed registration form.
- Submit roll number, department, year, and phone number.
- See deadline status and available seats.

Registration is blocked when:

- The event is not published.
- The registration deadline has passed.
- The event capacity is full.
- The student is already registered.

### Registration Audit Logs

Every event registration attempt is logged, whether successful or failed.

Stored log details include:

- Event ID and title.
- Student name and email.
- Roll number, department, year, and phone.
- Success or failure status.
- Failure reason.
- IP address.
- Timestamp.

Admins can view recent registration logs from the event management page.

### Policy Library and Circular Uploads

Admins can:

- Create policies.
- Update policies as new versions.
- Set categories, tags, effective date, active/inactive status.
- Upload PDF/image circulars for each policy.

Students can:

- View active policies.
- Search by title, code, summary, or tags.
- Filter by category.
- Open uploaded circulars.

### Real-Time Updates

Socket.io is used for real-time updates.

Examples:

- When an admin updates a request, the student dashboard can refresh automatically.
- When a student submits a request, admin views can update.
- When an event is created, updated, deleted, or registered for, event dashboards can refresh.

## Folder Structure

```text
unihelp/
├── build/                  # Production React build
├── public/                 # Static frontend assets
├── server/
│   ├── config/             # DB and Cloudinary config
│   ├── controllers/        # API business logic
│   ├── middleware/         # Auth, upload, error handling
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routes
│   ├── utils/              # JWT, seed, migration helpers
│   ├── index.js            # Express server entry point
│   └── socket.js           # Socket.io setup
├── src/
│   ├── components/         # Reusable React components
│   ├── context/            # Auth context
│   ├── pages/              # Student/admin pages
│   ├── styles/             # Global styles
│   ├── utils/              # API, storage, socket client
│   ├── App.js              # React routes
│   └── index.js            # React entry point
├── .env.example            # Environment variable sample
├── package.json
└── README.md
```

## Environment Variables

Create a `.env` file in the project root using `.env.example` as reference.

```env
PORT=5000
NODE_ENV=development
REACT_APP_API_URL=http://localhost:5000/api
MONGODB_URI=mongodb://127.0.0.1:27017/unihelp
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
REACT_APP_DEMO_STUDENT_EMAIL=
REACT_APP_DEMO_STUDENT_PASSWORD=
REACT_APP_DEMO_ADMIN_EMAIL=
REACT_APP_DEMO_ADMIN_PASSWORD=
```

Cloudinary variables are required for event poster and policy circular uploads.

## Installation and Setup

Install dependencies:

```bash
npm install
```

Start MongoDB locally, then run the backend and frontend separately:

```bash
npm run server:dev
```

```bash
npm run client:dev
```

Or run both together:

```bash
npm run dev
```

Build the frontend:

```bash
npm run build
```

Run the production server:

```bash
npm start
```

## Important API Routes

### Auth

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/signup` | Register user |
| GET | `/api/auth/me` | Get current logged-in user |
| GET | `/api/auth/users` | Admin: get all users |

### Requests

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/requests/dashboard/student` | Student dashboard data |
| GET | `/api/requests/dashboard/admin` | Admin dashboard data |
| GET | `/api/requests` | Admin: all requests |
| GET | `/api/requests/user/:studentId` | Student requests |
| POST | `/api/requests` | Create request |
| POST | `/api/requests/:id/attachments` | Upload request attachments |
| PUT | `/api/requests/:id` | Admin: update request |
| POST | `/api/requests/escalation/run` | Admin: run SLA escalation |

### Events

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/events` | Get events |
| POST | `/api/events` | Admin: create event |
| PUT | `/api/events/:id` | Admin: update event |
| DELETE | `/api/events/:id` | Admin: delete event |
| POST | `/api/events/:id/poster` | Admin: upload poster |
| POST | `/api/events/:id/register` | Student: register for event |
| GET | `/api/events/:id/attendees/export` | Admin: export attendance CSV |
| GET | `/api/events/registrations/logs` | Admin: registration audit logs |

### Policies

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/policies` | Get policies |
| GET | `/api/policies/:id` | Get policy details |
| POST | `/api/policies` | Admin: create policy |
| PUT | `/api/policies/:id` | Admin: update/new version |
| POST | `/api/policies/:id/circulars` | Admin: upload circular |

## Key Concepts Used

### Express Middleware

The backend uses middleware for:

- Parsing JSON request bodies.
- Handling CORS.
- Protecting routes with authentication.
- Checking role-based permissions.
- Handling file uploads.
- Centralized error handling.

### MongoDB and Mongoose

MongoDB stores the main application data. Mongoose defines schemas for users, requests, events, policies, and registration logs.

### JWT Authentication

On login, the backend returns a JWT token. The frontend stores it and sends it in the `Authorization` header for protected API requests.

### Socket.io

Socket.io allows the backend to emit events to connected clients. Admins and students join different socket rooms so updates can be targeted by role.

### File Uploads

Multer receives uploaded files from the frontend. Cloudinary stores event posters and policy circulars.

## Testing Checklist

### Student Flow

- Login as student.
- Submit a new request.
- Upload request attachments.
- View request status updates.
- Open event poster overlay.
- Register for an event before deadline.
- Confirm registration appears in MongoDB.
- Confirm deadline-passed events cannot be registered for.
- View active policies and circulars.

### Admin Flow

- Login as admin.
- View all requests.
- Assign request to admin.
- Update request priority/status/history.
- Create event.
- Upload event poster.
- Set registration deadline and capacity.
- Edit deadline or seats.
- Export attendance CSV.
- View registration logs.
- Create/update policy.
- Upload policy circular.

## Development Notes

- Keep MongoDB running before starting the server.
- If frontend API calls fail, check `REACT_APP_API_URL`.
- If file uploads fail, check Cloudinary environment variables.
- If real-time updates do not appear, confirm both users are connected to the same backend server and not separate localhost servers.
- After backend route or model changes, restart the server.

## Project Status

Implemented major modules:

- Authentication and role protection.
- MongoDB persistence.
- Request management with admin workflow.
- SLA and escalation support.
- Event management with poster upload.
- Detailed event registration with audit logs.
- Policy library with circular uploads.
- Real-time updates using Socket.io.

