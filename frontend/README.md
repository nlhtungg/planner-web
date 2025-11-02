# Auth Frontend - React + Tailwind CSS

A modern, responsive frontend for testing the authentication service API. Built with React, Vite, and Tailwind CSS.

## Features

✅ **User Registration** - Create account with email/password
✅ **User Login** - Sign in with credentials  
✅ **Profile Dashboard** - View and edit user information
✅ **Protected Routes** - Automatic redirection for unauthenticated users
✅ **Token Management** - Automatic token refresh on 401 errors
✅ **Responsive Design** - Works on desktop and mobile
✅ **Google OAuth Ready** - UI components for Google Sign-In (backend integration needed)

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors

## Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

### 3. Test the Application

1. Go to http://localhost:3000
2. Click "create a new account" to register
3. Fill in the registration form
4. You'll be redirected to the dashboard
5. Test profile editing
6. Logout and try logging in again

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── ProtectedRoute.jsx    # Route guard component
│   ├── context/
│   │   └── AuthContext.jsx       # Auth state management
│   ├── pages/
│   │   ├── Login.jsx             # Login page
│   │   ├── Register.jsx          # Registration page
│   │   └── Dashboard.jsx         # User dashboard
│   ├── services/
│   │   └── authService.js        # API service layer
│   ├── App.jsx                   # Main app component
│   ├── main.jsx                  # App entry point
│   └── index.css                 # Global styles + Tailwind
├── index.html                    # HTML template
├── package.json                  # Dependencies
├── vite.config.js               # Vite configuration
└── tailwind.config.js           # Tailwind configuration
```

## Available Pages

### Login (`/login`)
- Email/username and password login
- Link to registration page
- Google Sign-In button (UI only)

### Register (`/register`)
- Full registration form
- Client-side validation
- Password confirmation
- Link to login page

### Dashboard (`/dashboard`)
- Protected route (requires authentication)
- User profile display
- Profile editing
- Account details
- Logout functionality

## API Integration

The frontend connects to the auth-service API at `http://localhost:3001/api/auth`

### Authentication Flow

1. **Registration/Login**
   - User submits credentials
   - API returns user data + tokens
   - Tokens stored in localStorage
   - User redirected to dashboard

2. **Protected Requests**
   - Access token automatically added to headers
   - On 401 error, refresh token is used
   - If refresh fails, user is logged out

3. **Logout**
   - Tokens removed from localStorage
   - User redirected to login

## Features Demo

### Registration
```javascript
// POST /api/auth/register
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Login
```javascript
// POST /api/auth/login
{
  "identifier": "john@example.com", // or "johndoe"
  "password": "SecurePass123"
}
```

### Update Profile
```javascript
// PUT /api/auth/profile
{
  "firstName": "Jonathan",
  "lastName": "Doe"
}
```

## Error Handling

The app handles various error scenarios:

- **Email already registered** - Shows appropriate error message
- **Invalid credentials** - Shows error on login page
- **Passwords don't match** - Client-side validation
- **Email collision** - Shows backend error message about auth method mismatch
- **Network errors** - Shows generic error message
- **Token expiration** - Automatic refresh or redirect to login

## Customization

### Change API URL

Edit `src/services/authService.js`:

```javascript
const API_BASE_URL = 'http://your-api-url/api/auth';
```

### Modify Styles

Tailwind classes can be customized in:
- `tailwind.config.js` - Theme configuration
- `src/index.css` - Custom components and utilities

### Add Google OAuth

To enable Google Sign-In:

1. Add Google Sign-In library to `index.html`
2. Implement callback in Login/Register components
3. Call `googleLogin(idToken)` from AuthContext

Example:
```javascript
function handleCredentialResponse(response) {
  googleLogin(response.credential);
}
```

## Development

### Hot Reload

Vite provides instant hot module replacement. Changes to code will reflect immediately.

### Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## Testing Email Collision Prevention

1. **Register with Email/Password**
   - Register: `test@example.com` with password

2. **Try Google Sign-In with Same Email**
   - Error: "This email is already registered with a password"

3. **Vice Versa**
   - Register with Google first
   - Try email/password registration
   - Error: "This email is already registered with Google"

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### CORS Errors

Make sure the auth-service has CORS enabled for http://localhost:3000

### API Connection Failed

1. Verify auth-service is running: `docker ps | grep auth-service`
2. Check auth-service logs: `docker logs auth-service`
3. Test API directly: `curl http://localhost:3001/health`

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- [ ] Implement Google OAuth integration
- [ ] Add password strength indicator
- [ ] Implement change password functionality
- [ ] Add email verification flow
- [ ] Add password reset feature
- [ ] Implement remember me functionality
- [ ] Add loading states for all async operations
- [ ] Add form validation feedback
- [ ] Implement toast notifications
- [ ] Add dark mode support

## License

ISC
