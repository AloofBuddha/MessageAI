# Manual Testing Guide - Story 1.6: Optimistic UI & Message Status

## Prerequisites
1. Two test devices/emulators logged in as different users
2. Dev server running: `npm start` (in mobile directory)
3. Firebase project configured

## Test Scenarios

### 🧪 Test 1: Optimistic UI - Message Appears Instantly

**Steps:**
1. Open chat with another user
2. Type a message and hit send
3. **Observe immediately:**
   - Message appears at bottom of chat instantly
   - Shows spinning clock icon (🔄) in "sending" state
   - Message is visible before Firestore confirms

**Expected Result:**
- ✅ Message visible immediately (< 100ms)
- ✅ Clock icon is spinning/animating
- ✅ Message doesn't "jump" or flicker

---

### 🧪 Test 2: Status Progression - Sending → Sent

**Steps:**
1. Send a message while online
2. Watch the status icon change

**Expected Result:**
- ✅ Starts with spinning clock (sending)
- ✅ Changes to single gray checkmark ✓ (sent) after ~1s
- ✅ Smooth fade transition between icons

---

### 🧪 Test 3: Delivered Receipt

**Steps:**
1. **Device A:** Send message to User B
2. **Device B:** Open the conversation
3. **Device A:** Watch the status icon

**Expected Result:**
- ✅ Device A sees double gray checkmarks ✓✓ (delivered)
- ✅ Status updates within ~2 seconds of Device B opening chat
- ✅ Console log: "✅ Marked X messages as delivered"

---

### 🧪 Test 4: Read Receipt

**Steps:**
1. **Device A:** Send message to User B
2. **Device B:** Open conversation and keep screen focused for 2+ seconds
3. **Device A:** Watch the status icon

**Expected Result:**
- ✅ Device A sees double **blue** checkmarks ✓✓ (read)
- ✅ Status updates within ~3 seconds of Device B viewing
- ✅ Console log: "✅ Marked X messages as read"
- ✅ Color changes from gray → blue

---

### 🧪 Test 5: Multiple Messages - Batch Updates

**Steps:**
1. **Device A:** Send 5 messages quickly
2. **Device B:** Open conversation
3. Watch console logs on both devices

**Expected Result:**
- ✅ Console shows batch update: "✅ Marked 5 messages as delivered"
- ✅ All 5 status icons update together (not one-by-one)
- ✅ Only ONE Firestore batch write (check Firebase console)

---

### 🧪 Test 6: Read Receipt Debouncing

**Steps:**
1. **Device A:** Send 10 messages
2. **Device B:** Open chat and scroll quickly
3. Wait 1-2 seconds without scrolling
4. Check console logs

**Expected Result:**
- ✅ Read receipts don't fire on every scroll
- ✅ After 1s of inactivity, batch read receipt fires
- ✅ Console: "✅ Marked X messages as read" (single batch)

---

### 🧪 Test 7: Failed Message with Retry

**Steps:**
1. Turn off WiFi/mobile data on Device A
2. Send a message
3. **Observe:**
   - Message appears with clock icon
   - Wait 5-10 seconds
   - Status should change to failed (red alert icon ⚠️)
4. Red "Retry" button should appear below message
5. Turn WiFi back on
6. Tap "Retry" button

**Expected Result:**
- ✅ Failed state shows red alert icon
- ✅ "Retry" button visible below failed message
- ✅ After retry: message resends successfully
- ✅ Status progresses: sending → sent → delivered

---

### 🧪 Test 8: Offline Queue + Status Updates

**Steps:**
1. Turn off WiFi on Device A
2. Send 3 messages
3. All should show "sending" status
4. Turn WiFi back on
5. Watch status icons update

**Expected Result:**
- ✅ All 3 messages appear instantly while offline
- ✅ All show spinning clock icon
- ✅ When online: sync automatically
- ✅ Status updates: sending → sent → delivered

---

### 🧪 Test 9: Status Animations

**Steps:**
1. Send a message
2. Watch closely for animations

**Expected Animations:**
- ✅ **Sending:** Clock icon rotates/spins continuously
- ✅ **Status changes:** Smooth fade-in (200ms duration)
- ✅ No jarring jumps or flickers
- ✅ Icon opacity: 0 → 1 smoothly

---

### 🧪 Test 10: Own Messages vs Others' Messages

**Steps:**
1. Send messages from Device A
2. Receive messages on Device A from Device B

**Expected Result:**
- ✅ **Own messages:** Show status icons (right side)
- ✅ **Others' messages:** NO status icons (left side)
- ✅ Status icons only on own message bubbles

---

## Firebase Security Rules Testing

### 🧪 Test 11: Authorized Status Updates

**Steps:**
1. Open Firebase Console → Firestore
2. Try to manually update a message's `status` field
3. Try to add your userId to `readBy` array

**Expected Result:**
- ✅ You can update status/readBy if you're a participant
- ✅ Changes sync to app immediately

---

### 🧪 Test 12: Unauthorized Updates (Security)

**Steps:**
1. Try to update a message's `content` field directly in Firebase Console
2. Try to modify `senderId` field

**Expected Result:**
- ❌ Firestore rejects the update
- ❌ Error: "Missing or insufficient permissions"
- ✅ Only status/deliveredTo/readBy can be updated

---

## Performance Testing

### 🧪 Test 13: Large Conversation

**Steps:**
1. Open a conversation with 100+ messages
2. Observe initial load time
3. Check status icon rendering

**Expected Result:**
- ✅ Loads within 2 seconds
- ✅ All status icons render smoothly
- ✅ No lag when scrolling
- ✅ Batch delivered receipt fires once

---

## Known Issues to Watch For

❌ **Status icon doesn't update:** Check network connection, Firebase listener
❌ **Multiple batch calls:** Debouncing not working, check console logs
❌ **Failed retry not working:** Check pending_messages table in SQLite
❌ **Animations laggy:** Check device performance, reduce animation duration

---

## Testing Checklist

Before marking Story 1.6 complete, verify:

- [ ] Optimistic UI: messages appear instantly
- [ ] Status progression: sending → sent → delivered → read
- [ ] Animated icons: spinning clock for sending
- [ ] Delivered receipts work (gray checkmarks)
- [ ] Read receipts work (blue checkmarks)
- [ ] Failed messages show retry button
- [ ] Retry functionality works
- [ ] Batch updates (not individual calls)
- [ ] Debouncing prevents excessive API calls
- [ ] Firebase security rules enforced
- [ ] Own messages show status, others' don't
- [ ] Offline queue syncs with status updates
- [ ] No console errors
- [ ] Smooth animations, no lag

---

## Firebase Deployment

**To deploy Firestore security rules:**

```bash
# Make sure you're in the project root
cd /home/aloofbuddha/src/MessageAI

# Deploy only Firestore rules (doesn't affect other Firebase services)
firebase deploy --only firestore:rules

# Verify deployment
firebase firestore:rules list
```

**⚠️ Important:** Rules must be deployed to production before releasing this feature!

---

## Console Logs to Watch

**Good logs (expected):**
```
✅ Marked 5 messages as delivered
✅ Marked 3 messages as read
```

**Bad logs (investigate):**
```
❌ Error marking messages as delivered: ...
❌ Failed to mark messages as read: ...
❌ TypeError: Cannot read property 'id' of undefined
```

---

## Success Criteria

Story 1.6 is complete when:
- ✅ All 13 manual tests pass
- ✅ All 58 automated tests pass
- ✅ No TypeScript errors
- ✅ Firebase security rules deployed
- ✅ Performance is smooth (no lag)
- ✅ Status updates feel instant and reliable

