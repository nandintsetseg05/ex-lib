# Security Specification — Ex Libris

## 1. Data Invariants
1. Every document in `/books/{bookId}` must have a valid `bookId` matching `^[a-zA-Z0-9_-]+$` (max 128 chars).
2. A book record belongs strictly to one authenticated, email-verified user (`ownerId == request.auth.uid`).
3. `ownerId` and `createdAt` are immutable after creation.
4. `createdAt` (on create) and `updatedAt` (on create & update) must equal `request.time`.
5. `genre` must belong to the fixed 10-genre allowlist; `rating` must be an integer between `1` and `5`.
6. All string fields enforce strict `.size()` bounds (`title <= 200`, `author <= 150`, `summary <= 5000`, `keyTakeaway <= 500`, `dateFinished <= 32`, `coverImage <= 350000`).
7. Unauthenticated reads/writes, cross-user reads/list queries, and shadow/ghost fields are unconditionally denied.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Create**: Create `/books/book_1` with `request.auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Create `/books/book_1` with `email_verified == false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing**: Create `/books/book_1` with `ownerId: "victim_uid"` while signed in as `"attacker_uid"` -> `PERMISSION_DENIED`.
4. **Shadow / Ghost Field Injection**: Create `/books/book_1` including extra field `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Document ID Poisoning**: Create `/books/invalid..id$$$` or 200-char ID -> `PERMISSION_DENIED`.
6. **Client Timestamp Spoofing**: Create `/books/book_1` with `createdAt` set to a past client timestamp instead of `request.time` -> `PERMISSION_DENIED`.
7. **Cross-User Read (GET)**: User B calls `getDoc` on `/books/userA_book` -> `PERMISSION_DENIED`.
8. **Cross-User List (QUERY)**: User B queries `/books` without `where('ownerId', '==', userB.uid)` -> `PERMISSION_DENIED`.
9. **Owner Transfer on Update**: User A updates `/books/userA_book` to change `ownerId` to User B -> `PERMISSION_DENIED`.
10. **Immutable CreatedAt Tampering**: User A updates `/books/userA_book` and alters `createdAt` -> `PERMISSION_DENIED`.
11. **Value / Type Poisoning**: User A updates `rating` to `99` or `"five"` or sets `summary` > 5000 chars -> `PERMISSION_DENIED`.
12. **Invalid Genre Injection**: User A creates or updates a book with `genre: "UnauthorizedGenre"` -> `PERMISSION_DENIED`.
