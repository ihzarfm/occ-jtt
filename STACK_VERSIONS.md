# Stack And Versions

## Backend

- Go: 1.22
- Module: `occ-jtt/backend`

Source:
- `backend/go.mod`

## Frontend

- Node.js (local environment used during setup/build): v25.6.1
- React: 18.3.1
- React DOM: 18.3.1
- Vite: 5.4.21
- `@vitejs/plugin-react`: 4.7.0

Source:
- `frontend/package.json`
- `frontend/package-lock.json`

## Languages Used

- Go
- JavaScript (ES modules)
- JSX (React)
- CSS
- JSON
- Bash

## Notes

- `frontend/package.json` uses version ranges (`^`), but the exact installed versions above are taken from `frontend/package-lock.json`.
- If dependencies are updated later, update this file after running `npm install` or `npm update`.
