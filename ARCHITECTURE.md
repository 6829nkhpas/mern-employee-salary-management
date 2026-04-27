# Architecture

## Repo Shape

- No root `package.json` is present.
- `Frontend/` is a Vite + React 18 application.
- `Backend/` is a Node.js ESM Express application.

## Backend Stack

- Runtime: Node.js with `"type": "module"`
- HTTP server: `express`
- Database access: `sequelize` + `mysql2`
- Session storage: `express-session` + `connect-session-sequelize`
- Auth/password hashing: `argon2`
- File uploads: `express-fileupload`
- Date handling: `moment`

## Database Connection Method

- The backend creates a Sequelize instance in `Backend/config/Database.js`.
- Connection values come from environment variables loaded by `dotenv` in `Backend/index.js`.
- Current env keys used by the backend:
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASS` (supported password override)
  - `DB_PASSWORD`
  - `DB_HOST`
  - `DB_PORT`
  - `DB_DIALECT`
- Sessions are persisted through `connect-session-sequelize` into a `sessions` table using the same Sequelize connection.

## Core Employee/User Table

Source of truth found:

- Sequelize model: `Backend/models/DataPegawaiModel.js`
- SQL dump: `Backend/db/db_penggajian3.sql`

Core auth/user table is `data_pegawai`.

Columns found in the SQL dump:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `int(11)` | Primary key, auto increment |
| `id_pegawai` | `varchar(255)` | UUID-like external employee/session identifier |
| `nik` | `varchar(16)` | Employee number |
| `nama_pegawai` | `varchar(100)` | Employee name |
| `username` | `varchar(120)` | Login username |
| `password` | `varchar(255)` | Argon2 hash |
| `jenis_kelamin` | `varchar(15)` | Gender |
| `jabatan` | `varchar(50)` | Job title name |
| `tanggal_masuk` | `varchar(255)` | Stored as string, not SQL date |
| `status` | `varchar(50)` | Employment status |
| `photo` | `varchar(100)` | Uploaded filename |
| `url` | `varchar(255)` | Public image URL |
| `hak_akses` | `varchar(255)` | Role (`admin` or `pegawai` in sample data) |
| `createdAt` | `datetime` | Sequelize timestamp |
| `updatedAt` | `datetime` | Sequelize timestamp |

Important implementation note:

- The model defines the business fields above, but the SQL dump confirms the actual table also includes the integer primary key `id` plus timestamps.

## Other Known Tables

- `data_jabatan`
- `data_kehadiran`
- `overtime`
- `potongan_gaji`
- `sessions`

## Existing Backend API Routes

Routes are mounted without a prefix in `Backend/index.js`.

### Auth routes

- `GET /me`
- `POST /login`
- `DELETE /logout`

### Employee/master data routes

- `GET /data_pegawai`
- `GET /data_pegawai/id/:id`
- `GET /data_pegawai/nik/:nik`
- `GET /data_pegawai/name/:name`
- `POST /data_pegawai`
- `PATCH /data_pegawai/:id`
- `DELETE /data_pegawai/:id`
- `PATCH /data_pegawai/:id/change_password`

### Job title routes

- `GET /data_jabatan`
- `GET /data_jabatan/:id`
- `POST /data_jabatan`
- `PATCH /data_jabatan/:id`
- `DELETE /data_jabatan/:id`

### Attendance routes

- `GET /data_kehadiran`
- `GET /data_kehadiran/:id`
- `POST /data_kehadiran`
- `PATCH /data_kehadiran/update/:id`
- `DELETE /data_kehadiran/:id`

### Salary deduction routes

- `GET /data_potongan`
- `GET /data_potongan/:id`
- `POST /data_potongan`
- `PATCH /data_potongan/update/:id`
- `DELETE /data_potongan/:id`

### Overtime routes

- `GET /api/overtime/check`
- `POST /api/overtime`

### Salary data routes

- `GET /data_gaji_pegawai`
- `GET /data_gaji/name/:name`
- `GET /data_gaji_pegawai/month/:month`
- `GET /data_gaji_pegawai/year/:year`
- `GET /data_gaji/month/:month`
- `GET /data_gaji/year/:year`

### Report routes

- `GET /laporan/gaji`
- `GET /laporan/gaji/name/:name`
- `GET /laporan/gaji/month/:month`
- `GET /laporan/gaji/year/:year`
- `GET /laporan/absensi/month/:month`
- `GET /laporan/absensi/year/:year`
- `GET /laporan/slip_gaji/name/:name`
- `GET /laporan/slip_gaji/month/:month`
- `GET /laporan/slip_gaji/year/:year`

### Shared account routes

- `PATCH /change_password`
- `DELETE /logout`

### Pegawai dashboard route

- `GET /dashboard`

## Controller/Query Structure

- CRUD-style resources (`data_pegawai`, `data_jabatan`, `data_kehadiran`, `potongan_gaji`) primarily use Sequelize model methods such as `findAll`, `findOne`, `create`, `update`, and `destroy`.
- Overtime validation uses Sequelize aggregates directly in the backend (`Overtime.sum(...)`) to enforce monthly limits without loading full result sets into Node.js.
- Salary aggregation is currently computed in application code inside `Backend/controllers/TransaksiController.js` by loading employee, job, attendance, and deduction datasets separately and combining them in JavaScript.
- Report controllers in `Backend/controllers/LaporanController.js` mostly filter the aggregated salary or attendance arrays returned by controller helper methods.

## Overtime Data Model

- Sequelize model: `Backend/models/OvertimeModel.js`
- Association bootstrap: `Backend/models/index.js`
- Fields:
  - `id` (primary key, auto increment)
  - `worker_id` (foreign key to `data_pegawai.id`)
  - `date` (`DATEONLY`)
  - `hours` (`INTEGER`)
  - `reason` (`STRING`)
- Associations:
  - `DataPegawai.hasMany(Overtime, { foreignKey: 'worker_id', as: 'overtimeEntries' })`
  - `Overtime.belongsTo(DataPegawai, { foreignKey: 'worker_id', as: 'pegawai' })`

## Frontend State Management

- Router host: `BrowserRouter` in `Frontend/src/main.jsx`
- Global state: Redux Toolkit store in `Frontend/src/config/redux/store.js`
- React Redux provider: `Frontend/src/App.jsx`
- Axios is configured globally with `axios.defaults.withCredentials = true`.

Configured Redux slices:

- `auth`
- `dataGajiPegawaiPrint`
- `dataPegawai`
- `dataJabatan`
- `dataKehadiran`
- `dataPotongan`
- `dataGaji`
- `laporanAbsensi`
- `laporanGaji`
- `slipGaji`
- `ubahPassword`

## Frontend Routing Structure

All route definitions are centralized in `Frontend/src/config/Routes/index.jsx`.

Public/common pages:

- `/`
- `/tentang`
- `/kontak`
- `/login`
- `/dashboard`

Admin pages:

- `/data-pegawai`
- `/data-pegawai/form-data-pegawai/add`
- `/data-pegawai/form-data-pegawai/edit/:id`
- `/data-jabatan`
- `/data-jabatan/form-data-jabatan/add`
- `/data-jabatan/form-data-jabatan/edit/:id`
- `/data-kehadiran`
- `/data-kehadiran/form-data-kehadiran/add`
- `/data-kehadiran/form-data-kehadiran/edit/:id`
- `/data-potongan`
- `/data-overtime`
- `/data-potongan/form-data-potongan/add`
- `/data-potongan/form-data-potongan/edit/:id`
- `/data-gaji`
- `/data-gaji/detail-data-gaji/name/:name`
- `/data-gaji/cetak-gaji/slip-gaji/name/:name`
- `/laporan/gaji`
- `/laporan/gaji/print-page`
- `/laporan/absensi`
- `/laporan/absensi/print-page`
- `/laporan/slip-gaji`
- `/laporan/slip-gaji/print-page`
- `/ubah-password`

Pegawai pages:

- `/data-gaji-pegawai`
- `/data-gaji-pegawai/print-page`
- `/ubah-password-pegawai`

Fallback:

- `*` -> `NotFound`
