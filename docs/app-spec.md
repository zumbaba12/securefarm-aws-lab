# SecureFarm App Spec

## Product Shape

SecureFarm is a minimal farmer monitor for the lab. It should feel like a practical operations tool for tracking plots and seasons, not a marketing site.

The TerraAgra inspiration should be limited to the broad concepts of farm plots, season records, and simple dashboard status. Do not copy TerraAgra code, assets, branding, or full feature scope.

## Core Screens

### Login

- Email and password fields.
- Demo credentials visible in local development only.
- Basic error state.
- Successful login routes to the dashboard.

### Dashboard

- Count of plots.
- Count of active seasons.
- Small list of recently updated plots or seasons.
- Clear navigation to plots and seasons.

### Plots

- List plots with name, location, size, crop, and status.
- Add plot form.
- Plot detail page showing seasons for that plot.
- Optional search/filter field if useful for the SQL injection lab.

### Seasons

- Create a season for a plot.
- Fields: season number/name, crop type, variety, start date, expected harvest date, status, notes.
- List seasons by plot and show active/completed state.

## Data Model

Minimum entities:

- `users`: id, name, email, password/hash or intentionally weak password handling for phase 1.
- `plots`: id, owner/user id, name, location, size_hectares, crop_type, status, notes.
- `seasons`: id, plot id, season_name or season_no, crop_type, variety, start_date, expected_harvest_date, status, notes.

## UX Direction

- Dense, calm dashboard layout.
- Mobile responsive, but desktop should be comfortable for repeated review.
- Use restrained farm colors: greens, soil neutrals, white/off-white surfaces, and one alert color.
- Avoid decorative landing-page treatment. The first screen after login should be the actual dashboard.

## Security Lab Requirement

The first implementation must make intentional vulnerabilities easy to find and test, but not hidden as accidental mistakes. Use comments or documentation markers such as `LAB_VULNERABILITY` near intentionally unsafe code.

Do not include real secrets, real credentials, real API keys, or production AWS values.
