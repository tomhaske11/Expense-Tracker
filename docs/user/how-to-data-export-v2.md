# How to Export Your Expense Data

**Last Updated:** August 21, 2026

Learn how to download your expense data in multiple formats with our advanced export feature. Whether you need a spreadsheet for analysis, a professional PDF report, or a JSON file for developers, we've got you covered!

---

## Table of Contents

- [What is Data Export?](#what-is-data-export)
- [When to Use This Feature](#when-to-use-this-feature)
- [Available Export Formats](#available-export-formats)
- [Step-by-Step Guide](#step-by-step-guide)
- [Filtering Your Data](#filtering-your-data)
- [Preview Before Export](#preview-before-export)
- [Tips & Tricks](#tips--tricks)
- [Common Questions](#common-questions)
- [Troubleshooting](#troubleshooting)

---

## What is Data Export?

The Data Export feature allows you to download all your expense records from the app to your computer. You can choose from three different file formats and apply filters to export exactly the data you need.

**What you can do:**
- Download expenses as CSV (for Excel/Google Sheets)
- Download as JSON (for technical use)
- Download as PDF (for professional reports)
- Filter by date range
- Filter by category
- Preview data before downloading
- Customize the filename

---

## When to Use This Feature

**Use Data Export when you need to:**

📊 **Analyze Data**
- Import expenses into Excel or Google Sheets for deeper analysis
- Create custom charts and pivot tables
- Share with accountants or financial advisors

📄 **Create Reports**
- Generate professional PDF reports for business expenses
- Submit expense reports to your employer
- Keep records for tax filing

💾 **Backup Data**
- Create local backups of your expense records
- Archive historical data
- Move data to another system

🔧 **Technical Use**
- Export JSON for developers
- Integrate with other software
- Perform custom data processing

---

## Available Export Formats

### CSV (Spreadsheet)

![Format Icon](./screenshots/export-format-csv.png)

**Best for:** Excel, Google Sheets, Numbers
**File size:** Small
**Contains:** Date, Category, Amount, Description
**Can open in:** Any spreadsheet application

**Use CSV when:**
- You want to analyze data in Excel
- You need to create charts and graphs
- You're sharing with accountants

### JSON (Developer Format)

![Format Icon](./screenshots/export-format-json.png)

**Best for:** Developers, programmers, technical users
**File size:** Small
**Contains:** All expense data plus metadata
**Can open in:** Text editors, development tools

**Use JSON when:**
- You're a developer integrating with other systems
- You need machine-readable format
- You want metadata like export date and totals

### PDF (Print-Ready Report)

![Format Icon](./screenshots/export-format-pdf.png)

**Best for:** Professional reports, printing, sharing
**File size:** Medium
**Contains:** Formatted report with title, summary, and table
**Can open in:** Any PDF reader (Adobe, Preview, etc.)

**Use PDF when:**
- You need a professional-looking report
- You're submitting expenses to your employer
- You want a print-ready document

---

## Step-by-Step Guide

### Step 1: Open the Export Feature

1. Open **Account** (the profile icon at the top right)
2. Find the **Your data** section
3. Click **Export CSV, JSON, PDF**

💡 **Note:** The export button only appears when you have at least one expense recorded.

---

### Step 2: Choose Your Export Format

![Screenshot: Format selection](./screenshots/export-step-2-format-selection.png)

1. The export modal will open
2. You'll see three format options at the top:
   - **CSV** - Spreadsheet compatible
   - **JSON** - Developer friendly
   - **PDF** - Print ready
3. Click on your preferred format
4. The selected format will be highlighted in blue

**Recommendation:** If you're unsure, choose **CSV** for Excel or **PDF** for reports.

---

### Step 3: Name Your File (Optional)

![Screenshot: Filename input](./screenshots/export-step-3-filename.png)

1. Look for the **"Filename"** field
2. By default, it's named `expenses-YYYY-MM-DD` (today's date)
3. Click the field and type a custom name if you want
4. The file extension (.csv, .json, or .pdf) is added automatically

**Examples:**
- `monthly-report-january`
- `business-expenses-2026`
- `tax-records-q1`

⚠️ **Important:** Don't include the file extension in your filename - it's added automatically!

---

### Step 4: Filter by Date Range (Optional)

![Screenshot: Date range filters](./screenshots/export-step-4-date-filters.png)

Want to export expenses from a specific time period?

1. Find the **"Date Range"** section
2. Click **"Start Date"** and select the beginning date
3. Click **"End Date"** and select the ending date
4. The export will only include expenses between these dates

**Examples:**
- Export January: Start = Jan 1, End = Jan 31
- Export Q1: Start = Jan 1, End = Mar 31
- Export 2025: Start = Jan 1, 2025, End = Dec 31, 2025

💡 **Tip:** You can leave both dates blank to export ALL expenses.

---

### Step 5: Filter by Category (Optional)

![Screenshot: Category filters](./screenshots/export-step-5-category-filters.png)

Want to export only specific categories?

1. Scroll to the **"Categories"** section
2. You'll see checkboxes for all categories:
   - Food & Dining
   - Transportation
   - Shopping
   - Entertainment
   - Bills & Utilities
   - Healthcare
   - Travel
   - Other
3. Click categories to select/deselect them
4. Blue checkboxes = included in export
5. Gray checkboxes = excluded from export

**Quick Actions:**
- **Select All** - Include all categories
- **Deselect All** - Uncheck all categories (then manually select what you want)

**Example:**
If you only want food expenses, click "Deselect All", then check only "Food & Dining".

---

### Step 6: Preview Your Data (Optional)

![Screenshot: Data preview toggle](./screenshots/export-step-6-preview-toggle.png)

Want to see what you're exporting?

1. Look for **"Show Data Preview"**
2. Click the arrow button to expand
3. A table will appear showing:
   - All expenses that match your filters
   - Date, Category, Amount, Description columns
   - Scroll through the data

![Screenshot: Preview table](./screenshots/export-step-6-preview-table.png)

**What you'll see:**
- If no expenses match your filters: "No expenses match the selected filters"
- If you have data: A scrollable table with all matching expenses

💡 **Tip:** Use preview to double-check your filters before exporting!

---

### Step 7: Check the Summary

![Screenshot: Export summary](./screenshots/export-step-7-summary.png)

Before you export, check the summary box at the top:

**It shows:**
- **Records:** How many expenses will be exported
- **Total Amount:** Sum of all filtered expenses
- **Format:** The file format you selected (CSV, JSON, or PDF)

Make sure these numbers look correct!

---

### Step 8: Export Your Data

![Screenshot: Export button](./screenshots/export-step-8-export-button.png)

Ready to download?

1. Click the blue **"Export Data"** button at the bottom right
2. You'll see a loading spinner for a moment
3. The file will download to your computer
4. The modal will close automatically

**What happens next:**
- Your browser's download manager will show the file
- The file is saved to your Downloads folder (usually)
- You can now open it with the appropriate program

---

### Step 9: Open Your Exported File

**For CSV files:**
1. Open Excel, Google Sheets, or Numbers
2. Click "File" → "Open"
3. Select your downloaded CSV file
4. The data will appear in a spreadsheet

**For PDF files:**
1. Double-click the PDF file
2. It opens in your default PDF reader
3. You can view, print, or share the report

**For JSON files:**
1. Open with a text editor (VS Code, Notepad++, etc.)
2. Or use a JSON viewer tool
3. Perfect for developers and technical users

---

## Filtering Your Data

### By Date Range

**Common Scenarios:**

**Last Month:**
- Start Date: First day of last month
- End Date: Last day of last month

**This Year:**
- Start Date: January 1, [current year]
- End Date: Leave blank (includes all future dates)

**Tax Year 2025:**
- Start Date: January 1, 2025
- End Date: December 31, 2025

**Last 30 Days:**
- Start Date: [30 days ago]
- End Date: [today]

### By Category

**Common Scenarios:**

**Business Expenses Only:**
1. Deselect All
2. Check: Transportation, Food & Dining, Travel

**Personal vs. Business:**
- Export twice with different categories
- Business: Transportation, Travel, Bills
- Personal: Entertainment, Shopping, Healthcare

**Tax-Deductible:**
1. Deselect All
2. Check only tax-deductible categories

### Combining Filters

You can use date AND category filters together!

**Example: Business meals in January**
- Start Date: Jan 1
- End Date: Jan 31
- Categories: Food & Dining only

---

## Preview Before Export

### Why Use Preview?

✅ **Verify Filters** - Make sure you're exporting the right data
✅ **Check Amounts** - See if totals match your expectations
✅ **Catch Mistakes** - Spot any incorrect expense entries
✅ **Confirm Count** - Verify the number of records

### How to Use Preview Effectively

1. Apply your filters first
2. Click "Show Data Preview"
3. Scroll through the table
4. Look for:
   - Unexpected expenses
   - Date range looks correct
   - Categories match your selection
   - Total amount makes sense

💡 **Pro Tip:** If you see expenses you don't want, adjust your filters and preview again!

---

## Tips & Tricks

### 🎯 Best Practices

**Tip #1: Use Descriptive Filenames**
```
Good: tax-report-2025-q1
Bad: export
```

**Tip #2: Export Regularly**
- Weekly: For active expense tracking
- Monthly: For monthly reports
- Quarterly: For business reviews
- Yearly: For tax preparation

**Tip #3: Keep Backups**
- Export all data monthly
- Save to multiple locations
- Include the date in the filename

**Tip #4: Choose the Right Format**
- Analysis needed? → CSV
- Professional report? → PDF
- Technical backup? → JSON

### ⚡ Quick Actions

**Export Everything:**
1. Click Export Data
2. Don't change any filters
3. Click Export
4. Done in 3 clicks!

**Export This Month:**
1. Click Export Data
2. Set start date to first of month
3. Leave end date blank
4. Click Export

**Export Business Only:**
1. Click Export Data
2. Click "Deselect All" under categories
3. Check business-related categories
4. Click Export

---

## Common Questions

### Q: Can I export more than once?

**A:** Yes! You can export as many times as you want. Each export creates a new file.

---

### Q: Where do exported files go?

**A:** They go to your browser's default download location, usually your **Downloads** folder. You can change this in your browser settings.

---

### Q: Can I export if I have no expenses?

**A:** No, the export button only appears when you have at least one expense in the system.

---

### Q: What if my filters result in zero expenses?

**A:** The export button will be disabled with a message saying "No data to export with current filters". Adjust your filters to include some data.

---

### Q: Can I export to Excel directly?

**A:** The app exports to CSV format, which Excel can open. Just double-click the CSV file, and it will open in Excel automatically.

---

### Q: Is my data sent to a server when exporting?

**A:** No! All export processing happens in your browser. Your data never leaves your computer.

---

### Q: Can I schedule automatic exports?

**A:** Not in this version. You need to manually click Export Data each time. (This feature may come in the future!)

---

### Q: What's the maximum number of expenses I can export?

**A:** There's no hard limit, but very large exports (10,000+ records) may take a few seconds, especially for PDF format.

---

### Q: Can I customize the PDF format?

**A:** The PDF uses a standard template with your expense data. Custom templates are not available in this version.

---

### Q: Why does my CSV look weird when I open it?

**A:** CSVs are plain text files. Make sure you're opening it with a spreadsheet program (Excel, Google Sheets) rather than a text editor.

---

### Q: Can I re-import exported data?

**A:** Not currently. Exports are one-way (download only). The JSON format could be used for re-importing in the future.

---

## Troubleshooting

### Problem: Export button doesn't appear

**Solution:**
- Make sure you have at least one expense recorded
- Try refreshing the page
- Check that you're on the Account page, in the Your data section

---

### Problem: Export button is grayed out

**Possible causes:**

**1. No data matches your filters**
- Check your date range isn't too narrow
- Check that you have at least one category selected
- Try clicking "Select All" under categories

**2. Filename is empty**
- Make sure there's text in the filename field
- The default filename should be there automatically

**3. Already exporting**
- Wait for the current export to finish
- The button disables during export to prevent double-clicks

---

### Problem: File won't download

**Solutions:**
- Check your browser's download settings
- Make sure you allowed downloads from this site
- Try a different browser
- Check if your download folder is full

---

### Problem: CSV opens as text file

**Solution:**
- Right-click the file
- Choose "Open with"
- Select your spreadsheet program (Excel, Google Sheets)
- Set it as the default for CSV files

---

### Problem: PDF won't open

**Solution:**
- Make sure you have a PDF reader installed
- Try downloading Adobe Reader (free)
- Check that the file finished downloading completely

---

### Problem: Exported data looks wrong

**Checklist:**
1. Check the preview before exporting
2. Verify your date range filters
3. Make sure all desired categories are checked
4. Look at the summary numbers (records and total)

---

### Problem: Special characters look weird

**Solution:**
- This is a character encoding issue
- In Excel: Use "Data" → "Get External Data" → "From Text"
- Choose "UTF-8" encoding
- Alternatively, export as PDF which handles encoding automatically

---

### Problem: Export takes too long

**Why:**
- Large datasets (5,000+ records) take longer
- PDF generation is slower than CSV/JSON
- Your computer's performance matters

**Solutions:**
- Use CSV or JSON for large datasets (much faster)
- Export smaller date ranges
- Close other programs to free up memory
- Be patient - it will complete!

---

### Problem: I can't find my downloaded file

**Solutions:**
1. Check your Downloads folder
2. Check your browser's download manager (Ctrl+J or Cmd+J)
3. Look in your browser settings for download location
4. Search your computer for the filename
5. Try exporting again

---

## What's Next?

Now that you know how to export data, you might want to:

**Learn More:**
- [How to Add Expenses](./how-to-add-expenses.md)
- [How to Use Filters](./how-to-use-filters.md)
- [Dashboard Guide](./dashboard-guide.md)

**For Developers:**
- [Export Implementation Details](../dev/data-export-v2-implementation.md)
- [API Documentation](../dev/api-reference.md)

**Need Help?**
- Check our [FAQ](./faq.md)
- Contact support
- Watch tutorial videos

---

## Quick Reference Card

### Export Formats

| Format | Best For | File Extension |
|--------|----------|----------------|
| CSV | Spreadsheets, Analysis | .csv |
| JSON | Developers, Technical | .json |
| PDF | Reports, Printing | .pdf |

### Filter Options

| Filter Type | What It Does |
|-------------|--------------|
| Start Date | Only include expenses on or after this date |
| End Date | Only include expenses on or before this date |
| Categories | Only include selected categories |

### Common Filename Examples

- `expenses-2026-01-15` (default format)
- `january-report`
- `business-expenses-q1`
- `tax-records-2025`
- `monthly-summary-march`

---

**Questions or Feedback?**

We'd love to hear from you! If this guide was helpful or if you have suggestions for improvement, please let us know.

**Related Resources:**
- [Technical Documentation for Developers](../dev/data-export-v2-implementation.md)
- [Feature Comparison: All Export Versions](../dev/export-versions-analysis.md)
- [Video Tutorial: Exporting Data](./tutorials/export-video.md) *(coming soon)*

---

*Last updated: August 21, 2026 | Version 2.0*
