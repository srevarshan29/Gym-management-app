# GymDesk — Product Specification

## Overview
GymDesk is a multi-tenant gym management web app (PWA) with two sides:
- **Staff/Owner side** — gym owners, admins, and staff manage members, payments, plans, and operations.
- **Member Portal** — individual gym members log in (Google sign-in) to view their own plan, payments, diet, and workouts.

This document lists every feature the app must support after the rebuild — both what already exists (carried over) and what's new.

---

## 1. Existing Core Features (carry over, re-verify after rebuild)

### Multi-tenant foundation
- Multiple independent gyms, fully data-isolated from each other (a member/payment/etc. in Gym A must never be visible to Gym B)
- Super-admin capability to provision new gyms

### Staff & Roles
- Roles: Owner, Admin, Staff — with different permission levels
- Staff login (email/password via Auth.js)
- Staff can view/manage: Members, Payments, Packages, Visitors, Employees, Events, Ledger (income/expense), Reports (CSV export)

### Members
- Add/edit member profiles: name, phone, email, gender, age, height, weight, fitness goal, photo
- Member packages/subscriptions with start/end dates, status (Active/Expiring Soon/Expired)
- Partial/installment payments (Paid / Pending tracking)
- Payment receipts (PDF, downloadable)
- Membership policy / liability waiver — gym-editable text, required checkbox at signup, timestamped agreement record
- QR self-registration — public link members can scan to register themselves (staff reviews/converts to full member)
- "Added by" staff accountability tracking

### Member Portal (member-facing)
- Google sign-in, scoped per gym
- Overview: plan status, days remaining (progress ring), pending dues
- Profile: own info, editable stats (age/height/weight/fitness goal)
- Payments: own payment history (read-only)
- Diet Plan: assigned plan (read-only)
- Workout Plan: assigned structured program, exercise-by-exercise
- Tools: BMI calculator, Protein calculator, Calorie calculator (auto-filled from own stats)

### Workout Tracking
- Exercise library (per-gym, staff can add custom exercises)
- Structured workout plans: exercises grouped by day/block, with target sets/reps/tempo/rest/weight
- Member-side session logging: per-set weight logging, session timer, rest timer, mark complete
- Progress graphs (weight over time per exercise, target line) — visible to both member and staff

### Diet Plans
- Staff-assigned, one active plan per member: title, calories/day, meal plan text

### Operations
- Employees (HR-style records, separate from staff logins)
- Events (gym events/workshops, simple list)
- Reports (CSV export per module: Members, Payments, Employees, Visitors, Events, Diet/Workout Plans, PT Members)
- Accounts & Finance ledger (manual income/expense entries + auto-included member payment income; Net profit calculation)

### Dashboard & Analytics
- KPI cards (Active Members, Revenue, Expiring Soon, Expired, New Members, Collection Rate, Pending Payments)
- Revenue Trend chart, Member Joins chart, Package Distribution chart
- Pending Dues page, Upcoming Renewals page, Expired Memberships page

### PT (Personal Training)
- Mark members as PT, assign a trainer (from staff), dedicated PT Members view

---

## 2. New Features for This Rebuild

### PWA (Progressive Web App)
- Installable on phone home screen (icon, full-screen launch, no browser chrome)
- Fast repeat-open (cached app shell)
- Works reasonably even on weak/spotty connections for already-visited screens
- Simple code-based letter-mark icon as placeholder branding (swap for real logo later)

### Exercise Library — powered by ExerciseDB (live API, not stored)
- Members and staff can search/browse exercises by name, muscle group, or equipment
- Each exercise shows: target muscles, equipment needed, demo animation/video, step-by-step instructions, safety notes
- **Hard rule:** results are fetched live from the ExerciseDB API filtered by the search/tap — never bulk-loaded, never mirrored into our own database (see plan.md)
- Optional: 2D clickable muscle-group diagram for browsing by body part (inspired by reference app, flat illustration not 3D)

### Nutrition Tracking (member-facing)
- Searchable food log, per-meal entries (Meal 1, Meal 2, etc.)
- Macro breakdown per food (protein/carbs/fat)
- Daily calorie total vs. target, simple ring/summary visual

### Daily Goals Wizard (member-facing)
- Target weight, fitness goal selection (Weight Loss / Maintain / Muscle Gain / Strength)
- Auto-calculated daily calorie target + macro split based on goal and existing stored stats (reuses existing Calorie Calculator logic)

### Cardio Tracker (member-facing)
- Simple session tracker: duration, distance (optional manual entry), calories estimate
- Start/Pause/Finish, session summary, basic weekly totals

### Dashboard Polish (member-facing)
- "Today's Progress" quick-glance cards (Workouts / Duration / Calories) on Member Portal Overview
- Quick-action shortcuts (Log Workout, Add Water/Calories, Set Goal)

---

## 3. Parked / Future Phase (not in this rebuild, revisit later)
- CRM / Leads pipeline (visitor follow-up automation)
- Emergency contact + medical notes on member profile
- First-time onboarding guide (guided tour)
- AI help widget (in-app chat assistant)
- Dedicated Subscriptions summary page
- Gamification: leaderboards, streaks, quests, cross-gym "friend" connections (business model mismatch with current closed-per-gym design — revisit only if desired)
- Biometric attendance (fingerprint/face check-in) — blocked on gym owner choosing/purchasing physical hardware first

## 4. Explicit Non-Goals
- No cross-gym social features in this phase
- No 3D body models (2D diagram only, zero cost)
- No self-hosted exercise videos (always via live API)
