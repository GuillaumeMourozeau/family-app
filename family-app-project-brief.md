# Family Organizer App — Project Brief

## Overview
A mobile app (iOS + Android) for a small family (a few users) to share and organize everyday life: grocery lists, calendar, budget, and to-dos. Priority is simplicity and ease of use over feature depth.

## Tech Stack
- **Frontend**: React Native with Expo (TypeScript) — single codebase for iOS and Android
- **Backend**: Supabase (Postgres database, auth, realtime sync)
- **Distribution**: Expo Go for development/testing; TestFlight (iOS) and Play Store internal testing track (Android) for installing on family phones — no public store listing needed initially

## Core Principles
- Data must sync in real time across all family members' phones (shared grocery list, shared calendar, shared budget, shared to-dos)
- Simple, clean UI — this is for daily quick use, not a power-user tool
- Each family member has their own login/profile so items can be tagged to a person

## Features (in suggested build order)

### 1. Authentication & Family Setup
- Simple login (email or magic link via Supabase Auth)
- A "family" concept — one shared family group that all members join
- Each user has a name/profile so tasks/events can be attributed to them

### 2. To-Do List
- Multiple categories (user-defined, e.g. "Home", "Work", "Kids")
- Mark complete/incomplete
- Optional: assign a task to a specific family member

### 3. Grocery List
- Categorized items (e.g. Urgent, Food, Misc — user-editable categories)
- Add/check off items in real time, visible to all family members
- Optional: simple "recently used items" for quick re-adding

### 4. Calendar
- Shared family calendar with events
- Event types/filters: general events, sports, work schedule
- Visual highlighting for new events and "this week's" events
- Each event shows who it concerns (one member, several, or whole family)

### 5. Budget Management
- Track shared expenses/income
- Simple categorization (e.g. groceries, bills, leisure)
- Basic monthly overview (spent vs. budget)

### 6. Dashboard / Home Screen
- "Today at a glance" view: today's events, urgent grocery items, tasks due soon, quick budget status
- This becomes the app's landing screen once other modules exist

## Nice-to-Have Ideas (later phases)
- Meal planning tied to the grocery list (plan meals, auto-generate needed items)
- Recurring chores/rotation (e.g. who's on dishes duty this week)
- Shared notes/quick memos pinned for the whole family
- Push notifications/reminders (event coming up, task due, budget threshold)
- Recurring bill tracker with due-date alerts

## What to Build First (MVP)
1. Project scaffold: Expo app + Supabase connection + login screen
2. Family group creation/joining
3. To-do list (proves realtime sync works end-to-end)
4. Grocery list with categories
5. Calendar (events first; sports/work schedule as event types or filters)
6. Budget tracking
7. Dashboard pulling from all modules
8. Notifications

## Notes for Claude Code
- Build incrementally — get one feature fully working (including realtime sync) before moving to the next, rather than scaffolding everything at once
- Favor simple, editable category systems over hardcoded categories, since the family may want to adjust them later
- Keep the UI minimal and mobile-friendly by default (this is a daily-use utility app, not a showcase)
