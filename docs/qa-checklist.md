# VitaScan MVP QA Checklist

Use this checklist before local demos, deployment, and release smoke tests.

## Guest Symptom Check

- Open the web app while signed out.
- Choose **Continue as Guest**.
- Complete body area, symptom, questions, and optional health profile.
- Confirm the result page renders without requiring login.
- Confirm emergency/red-flag messaging appears for severe answers.
- Repeat until guest limit is reached and confirm a clear limit message.

## Google Login

- Click **Login with Google**.
- Complete the Supabase OAuth flow.
- Confirm redirect lands on `/dashboard`.
- Confirm dashboard shows the signed-in email.
- Sign out and confirm protected pages redirect or hide content.

## Profile Create / Update

- Open `/profile` as a logged-in user.
- Save a profile with age and sex assigned at birth.
- Add comma-separated medications, allergies, chronic conditions, and diet preferences.
- Save `None` in optional list fields and confirm it behaves like an empty list.
- Reload the page and confirm saved values persist.
- Try invalid values, such as age `140`, and confirm a clear error appears.

## Logged-In Symptom Check

- Start a symptom check while logged in.
- Confirm saved profile values prefill when available.
- Edit health info in the symptom check flow.
- Check **Save this to my profile for next time** and complete analysis.
- Confirm the result redirects to a saved session detail page.
- Return to profile and confirm edited health info was saved.

## Saved Session History

- Open `/dashboard`.
- Confirm recent sessions load with triage badges.
- Search by symptom/session title.
- Search by specialty when present.
- Filter by Home, PCP, Urgent Care, and ER.
- Sort by newest, oldest, and highest urgency.
- Use pagination Previous / Next when multiple pages exist.
- Delete a session after confirming the browser prompt.

## Session Detail Page

- Open a saved session.
- Confirm sections render: Overview, Recommended care, Red flags, Answers, Health profile snapshot.
- Click **Copy summary** and paste into a text editor.
- Click **Print summary** and confirm only the main summary prints.
- Open `/sessions/[id]?print=1` and confirm print dialog opens after load.
- Delete the session and confirm redirect back to dashboard.

## Recipes

- Open a saved session with a health profile snapshot.
- Confirm recommended recipes load or an empty state appears.
- Confirm recipes are labeled as wellness suggestions, not medical treatment.
- Confirm recipe API failure shows an error without breaking the session page.

## Chat

- Open a saved session and click **Ask follow-up questions**.
- Confirm `/sessions/[id]/chat` creates or opens a chat thread.
- Send a follow-up message and confirm user and assistant messages persist.
- Confirm the disclaimer is visible.
- Reach the free daily chat limit and confirm a clear limit message.

## Usage Limits

- Confirm dashboard shows daily symptom checks used/limit.
- Confirm dashboard shows daily chats used/limit.
- Confirm symptom check CTA disables when logged-in symptom limit is reached.
- Confirm API returns `429` with a clear message when limits are reached.

## Red-Flag / Emergency Behavior

- Choose answers that trigger chest pain, breathing trouble, severe sudden pain, or stroke-like symptoms.
- Confirm emergency guidance appears before normal advice.
- Confirm the AI response does not diagnose or prescribe.
- Confirm chat follow-up tells the user to seek emergency care for severe, sudden, or worsening symptoms.

## Deployment Smoke Test

- Visit the deployed web URL.
- Call the deployed API `/health` endpoint.
- Confirm Supabase connection status is reported without secrets.
- Log in with Google.
- Create/update profile.
- Run a symptom check.
- Open saved session detail.
- Test copy, print, chat, recipes, and delete.
