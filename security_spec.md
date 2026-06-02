# Security Specification (TDD) - Bin Aoun Study Office

This document outlines the Security Invariants, the "Dirty Dozen" malicious payload attacks, and the rules enforcement specifications to harden our Google Cloud Firestore database against unauthorised operations.

---

## 1. Security Invariants

1. **User Profiles (`/users/{userId}`)**:
   - Users can only read and write their own user profile document.
   - Users are strictly forbidden from changing other profiles, registering other users, or escalations.
   - Administrative overrides allow read/write access to authorised admins (`abdulmlikoog@gmail.com`).

2. **Support Tickets (`/tickets/{ticketId}`)**:
   - Creating a ticket requires standard authentication and that the `senderEmail` matches the authenticated user's email.
   - Students can only read and write tickets where they are the owner (`senderEmail`).
   - Admins can read, update, and manage all support tickets.
   - Non-authenticated requests are completely rejected.

3. **Discussions (`/discussions/{messageId}`)**:
   - Any authenticated student can read, create, and write posts in discussion channels.
   - However, a student cannot spoof the `authorName` or `authorRole` to appear as an `instructor` or `moderator`.
   - Modifying or deleting posts is restricted to the original author or site administrators.

4. **Notifications (`/notifications/{notificationId}`)**:
   - Notifications represent private PII communications.
   - Standard reading is locked such that users can only fetch notifications whose `targetEmail` matches their verified authentication email.
   - Only admins can write, broadcast, or create notifications.

5. **Exam History (`/users/{userId}/exams/{examId}`)**:
   - Only the specific authenticated student can read or append to their own exam history subcollection.
   - Values must have secure formats (score percentage must be within 0-100 limits).

---

## 2. The "Dirty Dozen" Malicious Payloads

The following malicious payloads must be blocked and rejected with `PERMISSION_DENIED` at the Firestore level:

### Malicious Payload 1: Profile Spoofing
- **Target Path**: `users/malicious_uid`
- **Identity**: Authenticated as `honest_student_uid`
- **Attempt**: Attacker attempts to modify someone else's profile name.
- **Expected Action**: `PERMISSION_DENIED` (ID Mismatch)

### Malicious Payload 2: Admin Role Injection
- **Target Path**: `users/honest_student_uid`
- **Identity**: Authenticated as `honest_student_uid`
- **Attempt**: Attacker requests update to their own profile, inserting a field `"isAdmin": true` or `"role": "admin"`.
- **Expected Action**: `PERMISSION_DENIED` (Strict schema / affectedKeys hasOnly check)

### Malicious Payload 3: Orphaned Ticket Injection (Identity Spoof)
- **Target Path**: `tickets/ticket_432`
- **Identity**: Authenticated as `hacker@gmail.com`
- **Attempt**: Attacker tries to create a ticket setting `senderEmail: "abdulmlikoog@gmail.com"` to spoof the admin or owner.
- **Expected Action**: `PERMISSION_DENIED` (Requires senderEmail == request.auth.token.email)

### Malicious Payload 4: Support Ticket Eavesdropping
- **Target Path**: `tickets/student_private_ticket_id`
- **Identity**: Authenticated as `hacker@gmail.com`
- **Attempt**: Attacker queries or lists private support tickets belonging to another student.
- **Expected Action**: `PERMISSION_DENIED`

### Malicious Payload 5: Unauthorized Support Ticket Reply (Privilege Escalation)
- **Target Path**: `tickets/student_private_ticket_id`
- **Identity**: Authenticated as `student_user@gmail.com` (non-admin)
- **Attempt**: Attacker attempts to update a ticket by injecting a `"reply": "fake admin statement"` and `"status": "closed"`.
- **Expected Action**: `PERMISSION_DENIED` (Only admins can write support replies)

### Malicious Payload 6: Discussion Spoofing (Instructor Impersonation)
- **Target Path**: `discussions/msg_99`
- **Identity**: Authenticated as `johndoe@gmail.com`
- **Attempt**: Attacker posts a message in discussions and sets `"authorRole": "instructor"` or `"authorRole": "moderator"`.
- **Expected Action**: `PERMISSION_DENIED` (Students must have authorRole == 'student')

### Malicious Payload 7: Discussion Vandalism (Deleting Someone Else's Message)
- **Target Path**: `discussions/legit_message_id`
- **Identity**: Authenticated as `hacker_student_uid`
- **Attempt**: Attacker tries to delete or modify a discussion post written by another student.
- **Expected Action**: `PERMISSION_DENIED`

### Malicious Payload 8: Premium Broadcast Injection
- **Target Path**: `notifications/notif_malicious_123`
- **Identity**: Authenticated as `student_user@gmail.com`
- **Attempt**: Attacker tries to broadcast a notification to all users or target a specific user with a fake billing message.
- **Expected Action**: `PERMISSION_DENIED` (Only admins can write notifications)

### Malicious Payload 9: Notification Interception
- **Target Path**: `notifications/legit_admin_notification_targeting_abdul`
- **Identity**: Authenticated as `hacker_student@gmail.com`
- **Attempt**: Attacker tries to read a private notification sent to the admin or another user.
- **Expected Action**: `PERMISSION_DENIED` (targetEmail must match request.auth.token.email)

### Malicious Payload 10: Exam Grade Spoofing (Infinite Score)
- **Target Path**: `users/attacker_uid/exams/math_exam`
- **Identity**: Authenticated as `attacker_uid`
- **Attempt**: Attacker submits an exam result setting `"scorePct": 9999` or `"scorePct": -5`.
- **Expected Action**: `PERMISSION_DENIED` (Range checker must mandate scorePct >= 0 && scorePct <= 100)

### Malicious Payload 11: Exam History Cross-Write
- **Target Path**: `users/victim_uid/exams/physics_exam`
- **Identity**: Authenticated as `attacker_uid`
- **Attempt**: Attacker tries to write an exam score into a victim's student history subdirectory.
- **Expected Action**: `PERMISSION_DENIED` (Document parent path userId must match request.auth.uid)

### Malicious Payload 12: Denial of Wallet ID Poisoning
- **Target Path**: `discussions/excessive_long_id_containing_vandalizing_text_more_than_one_kilobyte...`
- **Identity**: Authenticated as `attacker_uid`
- **Attempt**: Attacker targets discussion comments using a heavily poisoned string containing custom characters and excessive size (> 128 characters) as document ID.
- **Expected Action**: `PERMISSION_DENIED` (Rejected by isValidId() check)

---

## 3. Test Cases Draft Runner (`firestore.rules.test.ts`)

A test implementation framework would use `@firebase/rules-unit-testing`:

```typescript
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('Firestore Security Rules TDD Suite', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'gen-lang-client-0683153410',
      firestore: {
        host: 'localhost',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('rejects cross-profile writes (Payload 1)', async () => {
    const maliciousAliceContext = testEnv.authenticatedContext('alice_uid', { email: 'alice@gmail.com' });
    const victimBobRef = doc(maliciousAliceContext.firestore(), 'users', 'bob_uid');
    
    await expect(setDoc(victimBobRef, { username: 'Bob', email: 'bob@gmail.com' }))
      .rejects.toThrow();
  });

  it('rejects admin level escalations (Payload 2)', async () => {
    const context = testEnv.authenticatedContext('student_uid', { email: 'student@gmail.com' });
    const profileRef = doc(context.firestore(), 'users', 'student_uid');
    
    await expect(updateDoc(profileRef, { role: 'admin' }))
      .rejects.toThrow();
  });
});
```
