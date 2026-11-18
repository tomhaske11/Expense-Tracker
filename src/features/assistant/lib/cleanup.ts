/*
 * The one-click clean-up task. The label is what the user sees in the conversation; the
 * instructions go to Claude as a hidden [App note] with the same message.
 */

export const CLEANUP_LABEL = '🧹 Clean up my data';

export const CLEANUP_INSTRUCTIONS = `The user pressed "Clean up my data". Review ALL their expenses and propose fixes for:
1. Duplicates: call find_possible_duplicates. Treat a group as a duplicate only when it is clearly one charge recorded twice, which usually means the same day. Charges on different days count only for a clearly one-off purchase (the same $210 electronics order on consecutive days); routine purchases such as coffee, lunch or transit, and recurring bills, are not duplicates when the days differ. Propose deleting the extra copies and keep the earliest.
2. Inconsistent vendor names: call list_vendors. Where several spellings name the same merchant ("CHIPOTLE #1234", "chipotle", "Chipotle"), rename them all to one clean name in title case, preferring the spelling the user already uses most. Get the ids with query_expenses (search for the vendor; page with offset if has_more).
3. Wrong categories: an expense whose category clearly doesn't fit its vendor (an Uber under Other, a streaming subscription under Shopping). Only fix clear cases.

Make one propose_changes call per kind of fix that has any changes, with at most 50 changes each. Don't propose anything you're unsure about; list those items in your reply instead. Finish with a short summary: what you proposed, and anything you left for the user to decide. If everything already looks clean, say so and propose nothing.`;
