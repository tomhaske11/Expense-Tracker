# expenseAI

A personal expense tracker with Claude built in: a dark, black-and-teal web application built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## Features

- **Dashboard**: Visual overview of your spending with summary cards and charts
  - Total spending and expense count
  - Current month spending
  - Average expense amount
  - Top spending category
  - Interactive pie chart showing spending by category
  - Category breakdown with progress bars

- **Expense Management**:
  - Add new expenses with date, amount, category, and description
  - Edit existing expenses
  - Delete expenses with confirmation
  - Form validation for all inputs

- **Advanced Filtering**:
  - Search expenses by description, category, or amount
  - Filter by date range (start and end date)
  - Filter by category
  - Clear all filters with one click

- **Data Export**:
  - Export expenses to CSV format
  - Includes all expense details

- **Categories**:
  - Food
  - Transportation
  - Entertainment
  - Shopping
  - Bills
  - Other

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Storage**: localStorage (client-side)

## Getting Started

### Prerequisites

- Node.js 18+ installed on your machine
- npm or yarn package manager

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Usage Guide

### Adding an Expense

1. Click the "Add" tab in the navigation
2. Fill in the expense details:
   - **Date**: Select the date of the expense (defaults to today)
   - **Amount**: Enter the amount in USD
   - **Category**: Choose from available categories
   - **Description**: Add a brief description
3. Click "Add Expense"

### Viewing Expenses

1. Click the "Expenses" tab to view all expenses
2. Use the filter options to:
   - Search by keyword
   - Filter by category
   - Set a date range
3. Click the edit icon to modify an expense
4. Click the delete icon and confirm to remove an expense

### Dashboard Analytics

1. Click the "Dashboard" tab to view:
   - Summary cards with key metrics
   - Pie chart showing spending distribution
   - Category breakdown with percentages

### Exporting Data

1. Click the "Export CSV" button in the header (desktop) or the floating button (mobile)
2. Your expenses will be downloaded as a CSV file

## Features in Detail

### Form Validation

- Amount must be a positive number with up to 2 decimal places
- Date cannot be in the future
- Description is required
- All fields show inline error messages

### Responsive Design

- Mobile-first approach
- Adaptive navigation (icons only on mobile, full labels on desktop)
- Touch-friendly buttons and inputs
- Floating action button for mobile export

### Data Persistence

- All data is stored in browser localStorage
- Data persists across browser sessions
- No server or database required

### User Experience

- Loading states for data fetching
- Smooth transitions and hover effects
- Visual feedback for user actions
- Delete confirmation to prevent accidents
- Empty states with helpful messages

## Project Structure

Feature-first layout under `src/` (see `CLAUDE.md` for details on each folder):

```
expense-tracker-ai/
├── src/
│   ├── app/                     # Routes (Next.js App Router)
│   │   ├── page.tsx             # Home: Dashboard / Expenses / Add tabs
│   │   ├── top-categories/      # Category ranking
│   │   ├── top-vendors/         # Vendor ranking
│   │   └── monthly-insights/    # Donut, top 3, budget streak
│   ├── features/
│   │   ├── expenses/            # Core domain: types, constants, storage hook, filters, form, list
│   │   ├── analytics/           # Dashboard, MonthlyInsights, aggregation (stats.ts)
│   │   └── export/              # CSV / JSON / PDF export
│   └── lib/                     # Shared, domain-free helpers (formatting, ids)
├── public/                      # Static assets
└── docs/                        # dev/ and user/ documentation
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### TypeScript

The project uses strict TypeScript configuration for type safety. All components, hooks, and utilities are fully typed.

## Future Enhancements

Potential features for future versions:
- Recurring expenses
- Budget limits and alerts
- Multiple currency support
- Dark mode
- Cloud sync with backend
- Mobile app version
- Receipt photo uploads
- Advanced analytics and reports

## License

This project is open source and available under the MIT License.
